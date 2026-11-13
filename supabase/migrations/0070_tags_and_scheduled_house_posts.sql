-- 1) Posts by #tag: the Anonymous feed filtered to posts whose text carries the tag (same visibility rules as the main feed).
create or replace function public.get_anonymous_posts_by_tag(
  p_tag text,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 26
)
returns table (
  id uuid, scope text, school text, title text, body text, author_handle text,
  likes_count integer, comments_count integer, liked_by_me boolean, is_mine boolean,
  created_at timestamptz, media_items jsonb, card_theme text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_school text;
  v_pattern text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if p_tag is null or p_tag !~ '^[A-Za-z0-9_]{1,40}$' then raise exception 'invalid_anonymous_tag'; end if;
  if p_limit < 1 or p_limit > 51 or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_anonymous_cursor';
  end if;
  select profile.school into v_school from public.profiles profile where profile.id = v_user_id;
  v_pattern := '(^|[^[:alnum:]_])#' || p_tag || '([^[:alnum:]_]|$)';

  return query
  select post.id, post.scope, post.school, post.title, post.body, post.author_handle,
    post.likes_count, post.comments_count,
    exists (select 1 from public.anonymous_post_likes likes where likes.post_id = post.id and likes.identity_id = v_user_id),
    post.author_id = v_user_id,
    post.created_at, post.media_items, post.card_theme
  from public.anonymous_posts post
  where post.body ~* v_pattern
    and (p_before_created_at is null or (post.created_at, post.id) < (p_before_created_at, p_before_id))
    and (post.scope = 'all_nigerian_schools' or (post.scope = 'school' and v_school is not null and post.school = v_school))
    and not exists (
      select 1 from public.anonymous_post_owners owner
      join public.anonymous_blocks block on block.blocker_id = v_user_id and block.blocked_id = owner.owner_id
      where owner.post_id = post.id
    )
  order by post.created_at desc, post.id desc
  limit p_limit;
end;
$$;
revoke execute on function public.get_anonymous_posts_by_tag(text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_anonymous_posts_by_tag(text, timestamptz, uuid, integer) to authenticated;

-- 2) House posts published on a schedule. A post waits here until its time, then the nightly-style job below publishes it for real,
--    with the real time of publishing (nothing is back-dated). Only seeded (house) accounts can have scheduled posts.
create table if not exists public.scheduled_house_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Other' check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 3000),
  media_items jsonb not null default '[]'::jsonb,
  card_theme text not null default 'blue-hour',
  publish_at timestamptz not null,
  published_post_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.scheduled_house_posts enable row level security;
revoke all on public.scheduled_house_posts from anon, authenticated;
create index if not exists scheduled_house_posts_due_idx on public.scheduled_house_posts (publish_at) where published_at is null;

create or replace function public.publish_scheduled_house_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_handle text;
  v_post uuid;
  v_count integer := 0;
begin
  for r in
    select s.* from public.scheduled_house_posts s
    where s.published_at is null and s.publish_at <= now()
    order by s.publish_at
    limit 50
    for update skip locked
  loop
    select i.handle into v_handle from public.anonymous_identities i
    join auth.users u on u.id = i.user_id
    where i.user_id = r.author_id and u.is_anonymous and u.raw_user_meta_data->>'seeded' = 'true';
    if v_handle is null then
      update public.scheduled_house_posts set published_at = now() where id = r.id; -- not a house account any more: drop it
      continue;
    end if;
    insert into public.anonymous_posts (scope, school, title, body, author_id, author_handle, media_items, card_theme)
    values ('all_nigerian_schools', null, r.title, r.body, r.author_id, v_handle, r.media_items, r.card_theme)
    returning id into v_post;
    insert into public.anonymous_post_owners (post_id, owner_id) values (v_post, r.author_id);
    update public.scheduled_house_posts set published_post_id = v_post, published_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.publish_scheduled_house_posts() from public, anon, authenticated;

select cron.schedule('publish-house-posts', '*/10 * * * *', 'select public.publish_scheduled_house_posts()');
