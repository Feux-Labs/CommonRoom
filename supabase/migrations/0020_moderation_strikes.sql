-- Moderation: strikes and temporary restrictions.
-- Ladder: strike 1 = 3-day pause, strike 2 = 7-day pause, strike 3 and later = ban. Every restriction lifts
-- by itself after at most 7 days (the account is "reopened"); ended_notified_at is for the "you're back" email.
create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strike_number integer not null check (strike_number >= 1),
  kind text not null check (kind in ('suspension', 'ban')),
  reason text not null check (char_length(reason) between 1 and 500),
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz not null,
  created_by text not null default 'admin',
  ended_notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists user_restrictions_user_idx on public.user_restrictions (user_id, ends_at desc);
create index if not exists user_restrictions_notify_idx on public.user_restrictions (ends_at) where ended_notified_at is null;

-- Server only: no policies, and the API roles get no table access.
alter table public.user_restrictions enable row level security;
revoke all on public.user_restrictions from anon, authenticated;

-- Applies the next strike to a user. Called by the admin API only (not callable from the public API).
create or replace function public.apply_strike(p_user_id uuid, p_reason text, p_created_by text default 'admin')
returns table (strike_number integer, kind text, ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
  v_kind text;
  v_days integer;
begin
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'user_not_found';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
    raise exception 'invalid_reason';
  end if;

  select count(*)::int + 1 into v_n from public.user_restrictions r where r.user_id = p_user_id;
  if v_n = 1 then v_kind := 'suspension'; v_days := 3;
  elsif v_n = 2 then v_kind := 'suspension'; v_days := 7;
  else v_kind := 'ban'; v_days := 7;
  end if;

  return query
  insert into public.user_restrictions (user_id, strike_number, kind, reason, ends_at, created_by)
  values (p_user_id, v_n, v_kind, btrim(p_reason), timezone('utc', now()) + make_interval(days => v_days), p_created_by)
  returning user_restrictions.strike_number, user_restrictions.kind, user_restrictions.ends_at;
end;
$$;

-- The signed-in user's own active restriction, if any. Lets the API refuse writes.
create or replace function public.get_my_restriction()
returns table (kind text, reason text, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.kind, r.reason, r.ends_at
  from public.user_restrictions r
  where r.user_id = auth.uid() and r.starts_at <= timezone('utc', now()) and r.ends_at > timezone('utc', now())
  order by r.ends_at desc
  limit 1;
$$;

revoke all on function public.apply_strike(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_strike(uuid, text, text) to service_role;
revoke all on function public.get_my_restriction() from public, anon;
grant execute on function public.get_my_restriction() to authenticated;
