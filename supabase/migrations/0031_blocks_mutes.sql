-- Block and mute for real accounts. Enforced in the database, so every screen and API route obeys it:
--  * Block: neither person sees the other's posts, comments, listings or profile, and neither can follow, like,
--    comment on, or message the other. Existing follows between them are removed.
--  * Mute: only YOU stop seeing their posts and comments. They notice nothing.
-- The blocked person can never read that they were blocked (the table is not readable by anyone but the functions).
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.user_mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
create index if not exists user_mutes_muted_idx on public.user_mutes (muted_id);

alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
revoke all on public.user_blocks from anon, authenticated;
revoke all on public.user_mutes from anon, authenticated;

-- true when either of the two has blocked the other
create or replace function public.users_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a is not null and b is not null and a <> b and exists (
    select 1 from public.user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
create or replace function public.user_muted(muter uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select muter is not null and target is not null and exists (select 1 from public.user_mutes where muter_id = muter and muted_id = target);
$$;
revoke all on function public.users_blocked(uuid, uuid), public.user_muted(uuid, uuid) from public, anon;
grant execute on function public.users_blocked(uuid, uuid), public.user_muted(uuid, uuid) to authenticated;

-- ---- reading: hidden both ways (blocks) or from the muter (mutes) ----
drop policy if exists "Hide blocked and muted people's posts" on public.posts;
create policy "Hide blocked and muted people's posts" on public.posts as restrictive for select to authenticated
  using (not public.users_blocked((select auth.uid()), author_id) and not public.user_muted((select auth.uid()), author_id));
drop policy if exists "Hide blocked and muted people's comments" on public.post_comments;
create policy "Hide blocked and muted people's comments" on public.post_comments as restrictive for select to authenticated
  using (not public.users_blocked((select auth.uid()), author_id) and not public.user_muted((select auth.uid()), author_id));
drop policy if exists "Hide blocked people's listings" on public.marketplace_listings;
create policy "Hide blocked people's listings" on public.marketplace_listings as restrictive for select to authenticated
  using (not public.users_blocked((select auth.uid()), seller_id));
drop policy if exists "Hide blocked people's profiles" on public.profiles;
create policy "Hide blocked people's profiles" on public.profiles as restrictive for select to authenticated
  using (not public.users_blocked((select auth.uid()), id));

-- ---- acting: refused when blocked ----
create or replace function public.refuse_if_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
  v_actor uuid;
begin
  if tg_table_name = 'follows' then v_actor := new.follower_id; v_other := new.following_id;
  elsif tg_table_name = 'post_likes' then v_actor := new.user_id; select author_id into v_other from public.posts where id = new.post_id;
  elsif tg_table_name = 'post_comments' then v_actor := new.author_id; select author_id into v_other from public.posts where id = new.post_id;
  elsif tg_table_name = 'market_threads' then v_actor := new.buyer_id; v_other := new.seller_id;
  elsif tg_table_name = 'market_messages' then
    v_actor := new.sender_id;
    select case when t.buyer_id = new.sender_id then t.seller_id else t.buyer_id end into v_other from public.market_threads t where t.id = new.thread_id;
  end if;
  if public.users_blocked(v_actor, v_other) then
    raise exception 'blocked_user' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.refuse_if_blocked() from public, anon, authenticated;

drop trigger if exists refuse_if_blocked on public.follows;
create trigger refuse_if_blocked before insert on public.follows for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_if_blocked on public.post_likes;
create trigger refuse_if_blocked before insert on public.post_likes for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_if_blocked on public.post_comments;
create trigger refuse_if_blocked before insert on public.post_comments for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_if_blocked on public.market_threads;
create trigger refuse_if_blocked before insert on public.market_threads for each row execute function public.refuse_if_blocked();
drop trigger if exists refuse_if_blocked on public.market_messages;
create trigger refuse_if_blocked before insert on public.market_messages for each row execute function public.refuse_if_blocked();

-- ---- the things people can do ----
create or replace function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then raise exception 'account_required'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'user_not_found'; end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (v_me, p_user_id) on conflict do nothing;
  delete from public.follows where (follower_id = v_me and following_id = p_user_id) or (follower_id = p_user_id and following_id = v_me);
end;
$$;
create or replace function public.unblock_user(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
$$;
create or replace function public.mute_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not exists (select 1 from public.profiles where id = v_me) then raise exception 'account_required'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'user_not_found'; end if;
  insert into public.user_mutes (muter_id, muted_id) values (v_me, p_user_id) on conflict do nothing;
end;
$$;
create or replace function public.unmute_user(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.user_mutes where muter_id = auth.uid() and muted_id = p_user_id;
$$;

-- Who I have blocked / muted, with enough to show them in a list.
create or replace function public.list_blocked_users()
returns table (id uuid, display_name text, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.display_name, ''), 'Student'), p.username, p.avatar_url, b.created_at
  from public.user_blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid() order by b.created_at desc limit 500;
$$;
create or replace function public.list_muted_users()
returns table (id uuid, display_name text, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.display_name, ''), 'Student'), p.username, p.avatar_url, m.created_at
  from public.user_mutes m join public.profiles p on p.id = m.muted_id
  where m.muter_id = auth.uid() order by m.created_at desc limit 500;
$$;
-- Whether I have blocked / muted one person (for the button label on their profile).
create or replace function public.my_relationship(p_user_id uuid)
returns table (blocked boolean, muted boolean)
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user_id),
         exists (select 1 from public.user_mutes where muter_id = auth.uid() and muted_id = p_user_id);
$$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.mute_user(uuid), public.unmute_user(uuid),
  public.list_blocked_users(), public.list_muted_users(), public.my_relationship(uuid) from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.mute_user(uuid), public.unmute_user(uuid),
  public.list_blocked_users(), public.list_muted_users(), public.my_relationship(uuid) to authenticated;
