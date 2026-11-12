-- Chat streaks, the way TikTok does them: a conversation's streak is the number of days in a row (Nigeria time) on which BOTH people
-- sent at least one message. It stays alive through today until midnight; the pet (Ghaul) grows with it. Shown from 3 days.
create or replace function public.get_chat_streaks()
returns table (thread_id uuid, streak integer, today_done boolean, you_sent_today boolean)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  today as (select (now() at time zone 'Africa/Lagos')::date as d),
  mine as (
    select t.id as tid, t.sender_id as sender_id, l.owner_id as owner_id
    from public.anonymous_inbox_threads t
    join public.anonymous_inbox_links l on l.id = t.link_id, me
    where t.sender_id = me.uid or l.owner_id = me.uid),
  days as (
    select m.tid, (x.created_at at time zone 'Africa/Lagos')::date as d,
      bool_or(x.sender_id = m.sender_id) as from_sender, bool_or(x.sender_id = m.owner_id) as from_owner, bool_or(x.sender_id = (select uid from me)) as from_me
    from mine m join public.anonymous_inbox_messages x on x.thread_id = m.tid
    where x.created_at > now() - interval '400 days'
    group by m.tid, (x.created_at at time zone 'Africa/Lagos')::date),
  both_days as (select tid, d from days where from_sender and from_owner),
  islands as (select tid, d, d - (row_number() over (partition by tid order by d))::int as grp from both_days),
  runs as (select tid, grp, count(*)::int as run, max(d) as last_day from islands group by tid, grp),
  alive as (select r.tid, r.run, r.last_day from runs r, today t where r.last_day >= t.d - 1)
  select m.tid, coalesce(a.run, 0), coalesce(a.last_day = (select d from today), false),
    coalesce((select dd.from_me from days dd where dd.tid = m.tid and dd.d = (select d from today)), false)
  from mine m left join alive a on a.tid = m.tid
  where a.run is not null;
$$;
revoke all on function public.get_chat_streaks() from public, anon;
grant execute on function public.get_chat_streaks() to authenticated;
