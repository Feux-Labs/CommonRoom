create table if not exists public.admin_broadcasts (
  key text primary key default 'global' check (key = 'global'),
  message varchar(500) not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_broadcasts enable row level security;
revoke all on public.admin_broadcasts from anon, authenticated;
