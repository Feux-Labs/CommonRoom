-- Streak reminders are now claimed in small batches (default 200, at most 1000) so a huge audience is worked through over many calls
-- instead of one giant query that could time out and lose people.
drop function if exists public.claim_streak_reminders();
create or replace function public.claim_streak_reminders(p_limit integer default 200)
returns table (user_id uuid, away integer, run integer, points bigint)
language sql
security definer
set search_path = public
as $$
  with today as (select (now() at time zone 'Africa/Lagos')::date d),
  opens as (
    select distinct e.user_id uid, (e.created_at at time zone 'Africa/Lagos')::date d
    from public.app_events e where e.event = 'app_open' and e.user_id is not null and e.created_at > now() - interval '400 days'),
  lastopen as (select uid, max(d) ld from opens group by uid),
  cand as (select l.uid, l.ld, (t.d - l.ld) as gap from lastopen l, today t where (t.d - l.ld) in (1, 3, 7)),
  islands as (
    select o.uid, o.d, o.d - (row_number() over (partition by o.uid order by o.d))::int grp
    from opens o join cand c on c.uid = o.uid where o.d <= c.ld),
  runs as (
    select c.uid, c.ld, c.gap, count(*)::int run
    from cand c
    join islands i on i.uid = c.uid
    where i.grp = (select i2.grp from islands i2 where i2.uid = c.uid and i2.d = c.ld)
    group by c.uid, c.ld, c.gap having count(*) >= 3),
  eligible as (
    select r.* from runs r
    where (exists (select 1 from public.push_subscriptions s where s.user_id = r.uid) or exists (select 1 from public.profiles p where p.id = r.uid))
      and not exists (select 1 from public.streak_reminders x where x.user_id = r.uid and x.last_open = r.ld and x.away = r.gap)
    order by r.uid limit greatest(1, least(p_limit, 1000))),
  claimed as (
    insert into public.streak_reminders (user_id, last_open, away)
    select uid, ld, gap from eligible
    on conflict do nothing
    returning user_id as uid, away as gap)
  select e.uid, e.gap, e.run, coalesce((select l.peak_points + l.boost_bonus from public.user_levels l where l.user_id = e.uid), 0)
  from eligible e join claimed c on c.uid = e.uid and c.gap = e.gap;
$$;
revoke all on function public.claim_streak_reminders(integer) from public, anon, authenticated;
