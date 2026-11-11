-- People You May Know. Ranked by mutual follows (friends of friends) and, only when both people choose to show their
-- school, the same school. Never suggests: yourself, people you follow, people you blocked or who blocked you,
-- people you muted, or accounts with no username yet. A hidden school is never used and never revealed.
create or replace function public.suggest_people(p_limit integer default 12)
returns table (id uuid, display_name text, username text, avatar_url text, school text, mutual_count integer, same_school boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 12), 1), 30);
  v_school text;
  v_show boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select p.school, p.show_school_on_profile into v_school, v_show from public.profiles p where p.id = v_uid;
  if not found then return; end if;

  return query
  with mutuals as (
    select f2.following_id as candidate, count(*)::integer as n
    from public.follows f1
    join public.follows f2 on f2.follower_id = f1.following_id
    where f1.follower_id = v_uid
    group by f2.following_id
  ),
  scored as (
    select
      p.id, p.display_name, p.username, p.avatar_url,
      case when p.show_school_on_profile then p.school else null end as school,
      coalesce(m.n, 0) as mutual_count,
      (v_show and p.show_school_on_profile and v_school is not null and p.school = v_school) as same_school,
      p.created_at
    from public.profiles p
    left join mutuals m on m.candidate = p.id
    where p.id <> v_uid
      and p.username is not null and p.username <> ''
      and not exists (select 1 from public.follows x where x.follower_id = v_uid and x.following_id = p.id)
      and not exists (select 1 from public.user_blocks b where (b.blocker_id = v_uid and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = v_uid))
      and not exists (select 1 from public.user_mutes u where u.muter_id = v_uid and u.muted_id = p.id)
  )
  select s.id, s.display_name, s.username, s.avatar_url, s.school, s.mutual_count, s.same_school
  from scored s
  order by (s.mutual_count * 3 + (case when s.same_school then 2 else 0 end)) desc, s.created_at desc
  limit v_limit;
end;
$$;
revoke all on function public.suggest_people(integer) from public, anon;
grant execute on function public.suggest_people(integer) to authenticated;
