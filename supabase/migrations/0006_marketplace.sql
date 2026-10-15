-- 0006_marketplace.sql
-- Common Room Student Marketplace Schema (Phase 5)

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 5 and 4000),
  price numeric(12, 2) not null check (price >= 0),
  category text not null check (category in ('textbooks', 'electronics', 'hostel', 'fashion', 'services', 'food', 'other')),
  condition text not null default 'good' check (condition in ('new', 'like_new', 'good', 'fair')),
  location text not null check (char_length(location) between 2 and 120),
  school text,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8),
  status text not null default 'available' check (status in ('available', 'sold', 'reserved', 'removed')),
  contact_phone text,
  views_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_saved (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, listing_id)
);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes for lightning fast discovery and filtering
create index if not exists marketplace_listings_created_idx on public.marketplace_listings (created_at desc);
create index if not exists marketplace_listings_category_idx on public.marketplace_listings (category, created_at desc);
create index if not exists marketplace_listings_school_idx on public.marketplace_listings (school, created_at desc);
create index if not exists marketplace_listings_price_idx on public.marketplace_listings (price);
create index if not exists marketplace_listings_status_idx on public.marketplace_listings (status);
create index if not exists marketplace_listings_seller_idx on public.marketplace_listings (seller_id, created_at desc);
create index if not exists marketplace_saved_user_idx on public.marketplace_saved (user_id, created_at desc);

-- Auto updated_at trigger
drop trigger if exists marketplace_listings_set_updated_at on public.marketplace_listings;
create trigger marketplace_listings_set_updated_at before update on public.marketplace_listings
for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_saved enable row level security;
alter table public.marketplace_reports enable row level security;

-- Policies
create policy "Anyone authenticated can view active listings" on public.marketplace_listings
for select to authenticated using (status != 'removed' or seller_id = (select auth.uid()));

create policy "Users create their own listings" on public.marketplace_listings
for insert to authenticated with check (seller_id = (select auth.uid()));

create policy "Users update only their own listings" on public.marketplace_listings
for update to authenticated using (seller_id = (select auth.uid()))
with check (seller_id = (select auth.uid()));

create policy "Users delete only their own listings" on public.marketplace_listings
for delete to authenticated using (seller_id = (select auth.uid()));

-- Saved listings policies
create policy "Users view their own saved listings" on public.marketplace_saved
for select to authenticated using (user_id = (select auth.uid()));

create policy "Users save listings" on public.marketplace_saved
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users remove their saved listings" on public.marketplace_saved
for delete to authenticated using (user_id = (select auth.uid()));

-- Reports policies
create policy "Users submit listing reports" on public.marketplace_reports
for insert to authenticated with check (reporter_id = (select auth.uid()));

create policy "Users view their own submitted reports" on public.marketplace_reports
for select to authenticated using (reporter_id = (select auth.uid()));
