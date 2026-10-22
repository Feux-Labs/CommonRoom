alter table public.dating_profiles
  add column if not exists photo_urls text[] not null default '{}';

alter table public.dating_likes
  add column if not exists is_super_like boolean not null default false;

create table if not exists public.dating_passes (
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

alter table public.dating_passes enable row level security;

create policy "Users manage their own dating passes" on public.dating_passes
for all to authenticated using (from_user_id = (select auth.uid()))
with check (from_user_id = (select auth.uid()));
