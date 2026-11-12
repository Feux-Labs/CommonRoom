-- Invites count only when a different person really redeems them, once each. (Before, one account could redeem over and over.)
create table if not exists public.invite_redemptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null references public.invites(code) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.invite_redemptions enable row level security;
revoke all on public.invite_redemptions from anon, authenticated;
