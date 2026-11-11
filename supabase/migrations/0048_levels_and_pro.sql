-- Levels and Pro.
-- Levels come from real activity only (no fake points): posts, comments, and the likes and comments other people give you.
-- Anonymous activity counts toward your own level but the level is private to you, so it never links an Anonymous ID to you.
-- Pro is the existing Paystack product (user_entitlements.pro_until). Pro perks: a badge, up to 15 communities, no ads.
create or replace function public.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select e.pro_until > now() from public.user_entitlements e where e.user_id = p_user), false);
$$;
revoke all on function public.is_pro(uuid) from public, anon, authenticated;
grant execute on function public.is_pro(uuid) to service_role;

create or replace function public.my_level()
returns table (points bigint, level integer, level_name text, level_floor integer, next_level_at integer, pro boolean, pro_until timestamptz, ultimate_pass boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_points bigint;
  v_level integer;
  v_name text;
  v_floor integer;
  v_next integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;

  v_points :=
      5 * (select count(*) from public.posts p where p.author_id = v_uid)
    + 5 * (select count(*) from public.anonymous_posts p where p.author_id = v_uid)
    + 2 * (select count(*) from public.post_comments c where c.author_id = v_uid)
    + 2 * (select count(*) from public.anonymous_post_comments c where c.author_id = v_uid)
    + 1 * (select count(*) from public.post_likes l join public.posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid)
    + 1 * (select count(*) from public.anonymous_post_likes l join public.anonymous_posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid)
    + 2 * (select count(*) from public.post_comments c join public.posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid)
    + 2 * (select count(*) from public.anonymous_post_comments c join public.anonymous_posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid);

  select t.level, t.name, t.floor_points, t.next_points into v_level, v_name, v_floor, v_next
  from (values (1, 'Fresher', 0, 40), (2, 'Regular', 40, 150), (3, 'Campus Voice', 150, 500), (4, 'Influencer', 500, 1500), (5, 'Legend', 1500, null::integer))
    as t(level, name, floor_points, next_points)
  where v_points >= t.floor_points
  order by t.level desc limit 1;

  return query select v_points, v_level, v_name, v_floor, v_next,
    public.is_pro(v_uid), (select e.pro_until from public.user_entitlements e where e.user_id = v_uid),
    coalesce((select e.ultimate_pass from public.user_entitlements e where e.user_id = v_uid), false);
end;
$$;
revoke all on function public.my_level() from public, anon;
grant execute on function public.my_level() to authenticated;

-- Pro people can run up to 15 communities instead of 5. Everything else in create_community is unchanged.
create or replace function public.create_community(p_name text, p_description text, p_school text default null)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_desc text := btrim(coalesce(p_description, ''));
  v_base text;
  v_slug text;
  v_id uuid;
  v_limit integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;
  if char_length(v_name) not between 3 and 40 or char_length(v_desc) > 200 then raise exception 'invalid_community'; end if;
  v_limit := case when public.is_pro(v_uid) then 15 else 5 end;
  if (select count(*) from public.communities c where c.created_by = v_uid) >= v_limit then raise exception 'community_limit'; end if;
  perform public.consume_anonymous_rate_limit('community_create', 3, 86400);

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 2 then v_base := 'group'; end if;
  v_base := left(v_base, 40);
  v_slug := v_base;
  while exists (select 1 from public.communities c where c.slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.communities (slug, name, description, school, created_by)
  values (v_slug, v_name, v_desc, nullif(btrim(coalesce(p_school, '')), ''), v_uid) returning communities.id into v_id;
  insert into public.community_members (community_id, user_id, role) values (v_id, v_uid, 'owner');
  return query select v_id, v_slug;
end;
$$;
