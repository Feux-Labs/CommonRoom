create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text unique,
  education_status text not null default 'prefer_not_to_say'
    check (education_status in ('currently_in_school', 'not_in_school_yet', 'prefer_not_to_say')),
  school text,
  show_school_on_profile boolean not null default false,
  course text not null default '',
  year text not null default '',
  age_eligibility_confirmed boolean not null default false,
  interests text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_username text not null,
  school_label text,
  caption text not null default '',
  poll_options text[] not null default '{}',
  media_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(media_items) = 'array' and jsonb_array_length(media_items) <= 10),
  media_type text not null default 'text'
    check (media_type in ('photo', 'video', 'text', 'question', 'poll')),
  location text,
  audience text not null default 'Public'
    check (audience in ('Public', 'Followers', 'Private')),
  age_restricted boolean not null default false,
  allow_comments boolean not null default true,
  allow_reuse boolean not null default true,
  selected_sound text,
  share_to text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anonymous_posts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('school', 'all_nigerian_schools')),
  school text,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default timezone('utc', now()),
  check ((scope = 'school' and school is not null) or scope = 'all_nigerian_schools')
);

create table if not exists public.anonymous_post_likes (
  post_id uuid not null references public.anonymous_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.dating_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  school text,
  bio text not null default '' check (char_length(bio) <= 500),
  interests text[] not null default '{}',
  discoverable boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dating_likes (
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id, created_at desc);
create index if not exists anonymous_posts_created_at_idx on public.anonymous_posts (created_at desc);
create index if not exists dating_profiles_discoverable_idx on public.dating_profiles (discoverable, updated_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();
drop trigger if exists dating_profiles_set_updated_at on public.dating_profiles;
create trigger dating_profiles_set_updated_at before update on public.dating_profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.anonymous_posts enable row level security;
alter table public.anonymous_post_likes enable row level security;
alter table public.dating_profiles enable row level security;
alter table public.dating_likes enable row level security;

create policy "Users manage their own profile" on public.profiles
for all to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users read own follows and followers" on public.follows
for select to authenticated using (
  follower_id = (select auth.uid()) or following_id = (select auth.uid())
);
create policy "Users manage follows they create" on public.follows
for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Users remove follows they create" on public.follows
for delete to authenticated using (follower_id = (select auth.uid()));

create policy "Users read visible posts" on public.posts
for select to authenticated using (
  author_id = (select auth.uid())
  or audience = 'Public'
  or (audience = 'Followers' and exists (
    select 1 from public.follows
    where follows.follower_id = (select auth.uid())
      and follows.following_id = posts.author_id
  ))
);
create policy "Users create their own posts" on public.posts
for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Users update their own posts" on public.posts
for update to authenticated using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
create policy "Users delete their own posts" on public.posts
for delete to authenticated using (author_id = (select auth.uid()));

create policy "Users read likes on visible posts" on public.post_likes
for select to authenticated using (exists (
  select 1 from public.posts where posts.id = post_likes.post_id
));
create policy "Users manage their own post likes" on public.post_likes
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users read comments on visible posts" on public.post_comments
for select to authenticated using (exists (
  select 1 from public.posts where posts.id = post_comments.post_id
));
create policy "Users comment on visible posts" on public.post_comments
for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.posts where posts.id = post_comments.post_id and allow_comments)
);
create policy "Users delete their own comments" on public.post_comments
for delete to authenticated using (author_id = (select auth.uid()));

create policy "Authenticated users read anonymous posts" on public.anonymous_posts
for select to authenticated using (true);
create policy "Authenticated users create anonymous posts" on public.anonymous_posts
for insert to authenticated with check (true);
create policy "Users read anonymous likes" on public.anonymous_post_likes
for select to authenticated using (true);
create policy "Users manage their own anonymous likes" on public.anonymous_post_likes
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Age-eligible users read opted-in dating profiles" on public.dating_profiles
for select to authenticated using (
  user_id = (select auth.uid())
  or (
    discoverable
    and exists (
      select 1 from public.profiles target
      where target.id = dating_profiles.user_id and target.age_eligibility_confirmed
    )
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = (select auth.uid()) and viewer.age_eligibility_confirmed
    )
  )
);
create policy "Users manage their own dating profile" on public.dating_profiles
for all to authenticated using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.age_eligibility_confirmed
  )
);

create policy "Users read dating likes involving themselves" on public.dating_likes
for select to authenticated using (
  from_user_id = (select auth.uid()) or to_user_id = (select auth.uid())
);
create policy "Users send dating likes" on public.dating_likes
for insert to authenticated with check (
  from_user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.age_eligibility_confirmed
  )
);
create policy "Users remove their dating likes" on public.dating_likes
for delete to authenticated using (from_user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "Public can read post media" on storage.objects
for select to public using (bucket_id = 'post-media');
create policy "Users upload media into their own folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Users update media in their own folder" on storage.objects
for update to authenticated using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Users delete media in their own folder" on storage.objects
for delete to authenticated using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
