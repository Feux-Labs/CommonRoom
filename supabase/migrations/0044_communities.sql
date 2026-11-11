-- Communities: public groups (a school, a department, a hostel, an interest) that live inside Room.
-- Members post to the group from the normal Room composer; the posts also show in Room like any other post.
-- All reads and writes go through the functions below. The tables themselves are closed to direct access.
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 3 and 40),
  description text not null default '' check (char_length(description) <= 200),
  school text,
  created_by uuid not null references auth.users(id) on delete cascade,
  member_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
revoke all on public.communities from anon, authenticated;
revoke all on public.community_members from anon, authenticated;

alter table public.posts add column if not exists community_id uuid references public.communities(id) on delete set null;
create index if not exists posts_community_idx on public.posts (community_id, created_at desc) where community_id is not null;

create or replace function public.create_community(p_name text, p_description text, p_school text default null)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_desc text := btrim(coalesce(p_description, ''));
  v_base text;
  v_slug text;
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;
  if char_length(v_name) not between 3 and 40 or char_length(v_desc) > 200 then raise exception 'invalid_community'; end if;
  if (select count(*) from public.communities c where c.created_by = v_uid) >= 5 then raise exception 'community_limit'; end if;
  perform public.consume_anonymous_rate_limit('community_create', 3, 86400);

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 2 then v_base := 'group'; end if;
  v_base := left(v_base, 40);
  v_slug := v_base;
  while exists (select 1 from public.communities c where c.slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.communities (slug, name, description, school, created_by)
  values (v_slug, v_name, v_desc, nullif(btrim(coalesce(p_school, '')), ''), v_uid) returning communities.id into v_id;
  insert into public.community_members (community_id, user_id, role) values (v_id, v_uid, 'owner');
  return query select v_id, v_slug;
end;
$$;

create or replace function public.join_community(p_community_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;
  if not exists (select 1 from public.communities c where c.id = p_community_id) then raise exception 'community_not_found'; end if;
  insert into public.community_members (community_id, user_id) values (p_community_id, v_uid) on conflict do nothing;
  update public.communities c set member_count = (select count(*) from public.community_members m where m.community_id = p_community_id) where c.id = p_community_id;
  return true;
end;
$$;

create or replace function public.leave_community(p_community_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'account_required'; end if;
  if exists (select 1 from public.community_members m where m.community_id = p_community_id and m.user_id = v_uid and m.role = 'owner') then
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.community_members m where m.community_id = p_community_id and m.user_id = v_uid;
  update public.communities c set member_count = (select count(*) from public.community_members m where m.community_id = p_community_id) where c.id = p_community_id;
  return true;
end;
$$;

create or replace function public.delete_community(p_community_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'account_required'; end if;
  delete from public.communities c where c.id = p_community_id and c.created_by = auth.uid();
  return found;
end;
$$;

create or replace function public.list_communities(p_query text default null, p_limit integer default 30)
returns table (id uuid, slug text, name text, description text, school text, member_count integer, joined boolean, role text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.name, c.description, c.school, c.member_count,
    (m.user_id is not null), m.role
  from public.communities c
  left join public.community_members m on m.community_id = c.id and m.user_id = auth.uid()
  where auth.uid() is not null
    and (nullif(btrim(coalesce(p_query, '')), '') is null or c.name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '') || '%')
  order by c.member_count desc, c.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 60);
$$;

create or replace function public.get_community(p_slug text)
returns table (id uuid, slug text, name text, description text, school text, member_count integer, joined boolean, role text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.name, c.description, c.school, c.member_count, (m.user_id is not null), m.role
  from public.communities c
  left join public.community_members m on m.community_id = c.id and m.user_id = auth.uid()
  where auth.uid() is not null and c.slug = p_slug;
$$;

create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.community_members m where m.community_id = p_community_id and m.user_id = auth.uid());
$$;

revoke all on function public.create_community(text, text, text), public.join_community(uuid), public.leave_community(uuid),
  public.delete_community(uuid), public.list_communities(text, integer), public.get_community(text), public.is_community_member(uuid)
  from public, anon;
grant execute on function public.create_community(text, text, text), public.join_community(uuid), public.leave_community(uuid),
  public.delete_community(uuid), public.list_communities(text, integer), public.get_community(text), public.is_community_member(uuid)
  to authenticated;
