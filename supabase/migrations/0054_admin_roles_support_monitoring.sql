-- Admin roles, support tickets, visitor demographics and request monitoring.
-- Admin access no longer depends on an email in the environment: it is a row in admin_roles. All tables are closed to direct
-- access (RLS on, no policies); only the server reads and writes them.

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'moderator', 'support', 'analyst')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Settings the owner controls from the dashboard. admin_creation_locked = 'true' stops any new staff account being created.
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.admin_settings (key, value) values ('admin_creation_locked', 'false') on conflict (key) do nothing;

-- "Report a problem": anyone (guests too) can write to us, and staff reply in the same thread.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'other' check (kind in ('bug', 'account', 'abuse', 'payment', 'other')),
  subject text not null check (char_length(subject) between 1 and 120),
  status text not null default 'open' check (status in ('open', 'resolved')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, updated_at desc);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author text not null check (author in ('user', 'staff')),
  staff_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- Everyone who ever opened the app (guest or member) with where they are and what they use, from the request itself.
create table if not exists public.visitor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits integer not null default 1,
  country text,
  region text,
  city text,
  device text,
  os text,
  browser text
);
create index if not exists visitor_profiles_first_seen_idx on public.visitor_profiles (first_seen);

-- What people call. kind: request | auth_failed | admin_denied | rate_limited. flag: why a request looks suspicious.
create table if not exists public.request_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  kind text not null default 'request',
  method text,
  path text,
  query text,
  ip text,
  ua text,
  country text,
  user_id uuid,
  status integer,
  flag text
);
create index if not exists request_log_ts_idx on public.request_log (ts desc);
create index if not exists request_log_ip_idx on public.request_log (ip, ts desc);
create index if not exists request_log_flag_idx on public.request_log (ts desc) where flag is not null;

alter table public.admin_roles enable row level security;
alter table public.admin_settings enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.visitor_profiles enable row level security;
alter table public.request_log enable row level security;
revoke all on public.admin_roles, public.admin_settings, public.support_tickets, public.support_messages, public.visitor_profiles, public.request_log from anon, authenticated;
