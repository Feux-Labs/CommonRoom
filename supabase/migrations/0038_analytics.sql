-- Analytics: one row per event, keyed by user id (guests have ids too) plus is_anonymous and first-touch source.
-- Nobody can read or write these tables directly; people record events through track_event() and authors read
-- their own post numbers through post_insights(). The admin console reads them server-side.
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  event text not null,
  target_kind text,
  target_id uuid,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists app_events_event_time_idx on public.app_events (event, created_at desc);
create index if not exists app_events_target_idx on public.app_events (target_id, event) where target_id is not null;
create index if not exists app_events_user_time_idx on public.app_events (user_id, created_at desc);
alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;

-- Where each person first came from (the ?s= link tag). Set once, never overwritten.
create table if not exists public.acquisition_sources (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text not null,
  first_seen_at timestamptz not null default now()
);
alter table public.acquisition_sources enable row level security;
revoke all on public.acquisition_sources from anon, authenticated;

create or replace function public.track_event(p_event text, p_target_kind text default null, p_target_id uuid default null, p_source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_source text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source else null end;
begin
  if v_uid is null then return; end if;
  if p_event not in ('app_open', 'post_view', 'post_share', 'profile_view', 'listing_view', 'nudge_click') then
    raise exception 'invalid_event';
  end if;
  if p_target_kind is not null and p_target_kind not in ('room', 'anonymous', 'listing', 'profile') then
    raise exception 'invalid_target_kind';
  end if;
  -- A runaway client cannot flood the table: past 300 events an hour, extra events are quietly dropped.
  if (select count(*) from public.app_events where user_id = v_uid and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  -- One view per person per post per hour, so refreshing the page does not inflate the numbers.
  if p_event = 'post_view' and exists (
    select 1 from public.app_events
    where user_id = v_uid and event = 'post_view' and target_id is not distinct from p_target_id and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  if v_source is not null then
    insert into public.acquisition_sources (user_id, source) values (v_uid, v_source) on conflict (user_id) do nothing;
  end if;
  insert into public.app_events (user_id, is_anonymous, event, target_kind, target_id, source)
  values (v_uid, coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false), p_event, p_target_kind, p_target_id, v_source);
end;
$$;
revoke all on function public.track_event(text, text, uuid, text) from public, anon;
grant execute on function public.track_event(text, text, uuid, text) to authenticated;

-- Numbers for the author of a post: views, unique viewers, likes, comments (and shares for Room posts).
create or replace function public.post_insights(p_kind text, p_post_id uuid)
returns table (views bigint, viewers bigint, likes bigint, comments bigint, shares bigint)
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind = 'anonymous' then
    if not exists (select 1 from public.anonymous_post_owners where post_id = p_post_id and owner_id = v_uid) then
      raise exception 'not_your_post';
    end if;
    return query select
      (select count(*) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      (select count(distinct e.user_id) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      (select count(*) from public.anonymous_post_likes l where l.post_id = p_post_id),
      (select count(*) from public.anonymous_post_comments c where c.post_id = p_post_id),
      (select count(*) from public.app_events e where e.target_id = p_post_id and e.event = 'post_share');
  elsif p_kind = 'room' then
    if not exists (select 1 from public.posts where id = p_post_id and author_id = v_uid) then
      raise exception 'not_your_post';
    end if;
    return query select
      (select count(*) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      (select count(distinct e.user_id) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      (select count(*) from public.post_likes l where l.post_id = p_post_id),
      (select count(*) from public.post_comments c where c.post_id = p_post_id),
      (select count(*) from public.post_shares s where s.post_id = p_post_id);
  else
    raise exception 'invalid_kind';
  end if;
end;
$$;
revoke all on function public.post_insights(text, uuid) from public, anon;
grant execute on function public.post_insights(text, uuid) to authenticated;
