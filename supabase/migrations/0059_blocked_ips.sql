-- Addresses that are turned away at the door. Added by hand from the Security tab, or automatically when one address sends
-- several attack-looking requests in a short time. Auto blocks expire on their own; the staff can lift any block at once.
create table if not exists public.blocked_ips (
  ip text primary key check (char_length(ip) between 3 and 45),
  reason text not null default '',
  auto boolean not null default false,
  blocked_at timestamptz not null default now(),
  blocked_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz
);
alter table public.blocked_ips enable row level security;
revoke all on public.blocked_ips from anon, authenticated;
