-- Feature flags: switches the owner can flip from the admin console without a deploy.
-- Server-only: RLS is on with no policies, so only the server (service role / pooled connection) can read or write.
create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  enabled boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from anon, authenticated;

insert into public.feature_flags (key, enabled, description) values
  ('anonymous_posting', true, 'Anonymous: people can create new posts'),
  ('anonymous_inbox', true, 'Anonymous: public inbox links accept new messages'),
  ('room_tab', true, 'Show the Room tab in the bottom navigation'),
  ('market_tab', true, 'Show the Market tab in the bottom navigation'),
  ('signin_nudge', true, 'Show guests the occasional "sign in" reminder')
on conflict (key) do nothing;
