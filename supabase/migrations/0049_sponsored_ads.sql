-- Sponsored ads. Created by the admin only (sold to businesses directly), always labelled "Sponsored", never shown to Pro
-- members. Served and counted by the server; views and clicks are recorded as ordinary usage events, one view per person per
-- ad per hour. The table is closed to direct access.
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null check (char_length(advertiser) between 1 and 60),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 200),
  image_url text check (image_url is null or image_url ~ '^https://'),
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 1 and 24),
  link_url text not null check (link_url ~ '^https://'),
  placement text not null default 'anonymous_feed' check (placement in ('anonymous_feed')),
  school text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists ads_serving_idx on public.ads (placement, status, starts_at, ends_at);
alter table public.ads enable row level security;
revoke all on public.ads from anon, authenticated;

-- Record ad views and clicks with the same function as every other usage event.
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
  if p_event not in ('app_open', 'post_view', 'post_share', 'profile_view', 'listing_view', 'nudge_click', 'ad_view', 'ad_click') then
    raise exception 'invalid_event';
  end if;
  if p_target_kind is not null and p_target_kind not in ('room', 'anonymous', 'listing', 'profile', 'ad') then
    raise exception 'invalid_target_kind';
  end if;
  if (select count(*) from public.app_events where user_id = v_uid and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  -- One view per person per post (or ad) per hour, so refreshing does not inflate the numbers.
  if p_event in ('post_view', 'ad_view') and exists (
    select 1 from public.app_events
    where user_id = v_uid and event = p_event and target_id is not distinct from p_target_id and created_at > now() - interval '1 hour'
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
