create table if not exists public.anonymous_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (char_length(handle) between 3 and 24),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anonymous_inbox_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  token text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anonymous_inbox_threads (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.anonymous_inbox_links(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (link_id, sender_id)
);

create table if not exists public.anonymous_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.anonymous_inbox_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anonymous_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.anonymous_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_handle text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anonymous_post_owners (
  post_id uuid primary key references public.anonymous_posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.anonymous_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'comment', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reporter_id, target_kind, target_id)
);

create table if not exists public.anonymous_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.anonymous_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, action)
);

alter table public.anonymous_posts
  add column if not exists author_id uuid references auth.users(id) on delete cascade,
  add column if not exists author_handle text not null default 'Anonymous',
  add column if not exists likes_count integer not null default 0 check (likes_count >= 0),
  add column if not exists comments_count integer not null default 0 check (comments_count >= 0);

alter table public.anonymous_post_likes
  alter column user_id drop not null;

alter table public.anonymous_post_likes
  add column if not exists identity_id uuid references auth.users(id) on delete cascade;

create unique index if not exists anonymous_post_likes_identity_idx
  on public.anonymous_post_likes (post_id, identity_id)
  where identity_id is not null;

create index if not exists anonymous_posts_scope_created_at_idx
  on public.anonymous_posts (scope, created_at desc);
create index if not exists anonymous_post_comments_post_created_at_idx
  on public.anonymous_post_comments (post_id, created_at);
create index if not exists anonymous_inbox_threads_link_created_at_idx
  on public.anonymous_inbox_threads (link_id, created_at desc);
create index if not exists anonymous_inbox_messages_thread_created_at_idx
  on public.anonymous_inbox_messages (thread_id, created_at);
create index if not exists anonymous_reports_created_at_idx
  on public.anonymous_reports (created_at desc);

alter table public.anonymous_identities enable row level security;
alter table public.anonymous_inbox_links enable row level security;
alter table public.anonymous_inbox_threads enable row level security;
alter table public.anonymous_inbox_messages enable row level security;
alter table public.anonymous_post_comments enable row level security;
alter table public.anonymous_reports enable row level security;
alter table public.anonymous_blocks enable row level security;
alter table public.anonymous_rate_limits enable row level security;

revoke all on public.anonymous_identities from anon, authenticated;
revoke all on public.anonymous_inbox_links from anon, authenticated;
revoke all on public.anonymous_inbox_threads from anon, authenticated;
revoke all on public.anonymous_inbox_messages from anon, authenticated;
revoke all on public.anonymous_post_comments from anon, authenticated;
revoke all on public.anonymous_reports from anon, authenticated;
revoke all on public.anonymous_blocks from anon, authenticated;
revoke all on public.anonymous_rate_limits from anon, authenticated;
revoke all on public.anonymous_posts from anon, authenticated;
revoke all on public.anonymous_post_likes from anon, authenticated;

create or replace function public.consume_anonymous_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'anonymous_auth_required';
  end if;

  insert into public.anonymous_rate_limits (user_id, action, window_started_at, request_count)
  values (v_user_id, p_action, now(), 1)
  on conflict (user_id, action) do update
  set window_started_at = case
        when public.anonymous_rate_limits.window_started_at
          < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.anonymous_rate_limits.window_started_at
      end,
      request_count = case
        when public.anonymous_rate_limits.window_started_at
          < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.anonymous_rate_limits.request_count + 1
      end
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception 'anonymous_rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.register_anonymous_identity(p_handle text)
returns table (handle text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_handle text := btrim(p_handle);
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if v_handle !~ '^[A-Za-z0-9_ ]{3,24}$' then raise exception 'invalid_anonymous_handle'; end if;

  perform public.consume_anonymous_rate_limit('identity', 8, 3600);

  insert into public.anonymous_identities (user_id, handle)
  values (v_user_id, v_handle)
  on conflict (user_id) do nothing;

  return query
  select identity.handle, identity.created_at
  from public.anonymous_identities identity
  where identity.user_id = v_user_id;
exception
  when unique_violation then raise exception 'anonymous_handle_taken';
end;
$$;

create or replace function public.get_anonymous_identity()
returns table (handle text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select identity.handle, identity.created_at
  from public.anonymous_identities identity
  where identity.user_id = auth.uid();
$$;

create or replace function public.get_anonymous_posts(p_scope text, p_post_id uuid default null)
returns table (
  id uuid,
  scope text,
  school text,
  title text,
  body text,
  author_handle text,
  likes_count integer,
  comments_count integer,
  liked_by_me boolean,
  is_mine boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_school text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if p_scope not in ('school', 'all') then raise exception 'invalid_anonymous_scope'; end if;

  if p_scope = 'school' then
    select profile.school into v_school from public.profiles profile where profile.id = v_user_id;
    if v_school is null then return; end if;
  end if;

  return query
  select post.id, post.scope, post.school, post.title, post.body, post.author_handle,
    post.likes_count, post.comments_count,
    exists (
      select 1 from public.anonymous_post_likes likes
      where likes.post_id = post.id and likes.identity_id = v_user_id
    ),
    post.author_id = v_user_id,
    post.created_at
  from public.anonymous_posts post
  where (p_post_id is null or post.id = p_post_id)
    and (
      (p_scope = 'school' and post.scope = 'school' and post.school = v_school)
      or (p_scope = 'all' and post.scope = 'all_nigerian_schools')
    )
    and not exists (
      select 1 from public.anonymous_post_owners owner
      join public.anonymous_blocks block
        on block.blocker_id = v_user_id and block.blocked_id = owner.owner_id
      where owner.post_id = post.id
    )
  order by post.created_at desc
  limit 60;
end;
$$;

create or replace function public.create_anonymous_post(p_scope text, p_title text, p_body text)
returns table (
  id uuid,
  scope text,
  school text,
  title text,
  body text,
  author_handle text,
  likes_count integer,
  comments_count integer,
  liked_by_me boolean,
  is_mine boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_school text;
  v_post_id uuid;
  v_handle text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  select identity.handle into v_handle from public.anonymous_identities identity where identity.user_id = v_user_id;
  if v_handle is null then raise exception 'anonymous_identity_required'; end if;
  if p_scope not in ('school', 'all_nigerian_schools') then raise exception 'invalid_anonymous_scope'; end if;
  if char_length(btrim(p_title)) not between 1 and 120 then raise exception 'invalid_anonymous_title'; end if;
  if char_length(btrim(p_body)) not between 1 and 3000 then raise exception 'invalid_anonymous_body'; end if;
  perform public.consume_anonymous_rate_limit('post', 5, 3600);

  if p_scope = 'school' then
    select profile.school into v_school from public.profiles profile where profile.id = v_user_id;
    if v_school is null then raise exception 'anonymous_school_required'; end if;
  end if;

  insert into public.anonymous_posts (scope, school, title, body, author_id, author_handle)
  values (p_scope, v_school, btrim(p_title), btrim(p_body), v_user_id, v_handle)
  returning anonymous_posts.id into v_post_id;
  insert into public.anonymous_post_owners (post_id, owner_id) values (v_post_id, v_user_id);

  return query select * from public.get_anonymous_posts(p_scope, v_post_id);
end;
$$;

create or replace function public.toggle_anonymous_post_like(p_post_id uuid)
returns table (liked boolean, likes_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_removed integer;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_identities identity where identity.user_id = v_user_id) then
    raise exception 'anonymous_identity_required';
  end if;
  perform public.consume_anonymous_rate_limit('reaction', 60, 60);

  delete from public.anonymous_post_likes
  where post_id = p_post_id and identity_id = v_user_id;
  get diagnostics v_removed = row_count;
  if v_removed = 0 then
    insert into public.anonymous_post_likes (post_id, user_id, identity_id)
    values (p_post_id, null, v_user_id);
  else
    update public.anonymous_posts post
    set likes_count = greatest(0, post.likes_count - 1)
    where post.id = p_post_id;
  end if;
  if v_removed = 0 then
    update public.anonymous_posts post set likes_count = post.likes_count + 1 where post.id = p_post_id;
  end if;

  return query
  select v_removed = 0, post.likes_count from public.anonymous_posts post where post.id = p_post_id;
end;
$$;

create or replace function public.get_anonymous_comments(p_post_id uuid)
returns table (id uuid, author_handle text, body text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_posts post where post.id = p_post_id) then
    raise exception 'anonymous_post_not_found';
  end if;
  return query
  select comment.id, comment.author_handle, comment.body, comment.created_at
  from public.anonymous_post_comments comment
  where comment.post_id = p_post_id
  order by comment.created_at asc
  limit 100;
end;
$$;

create or replace function public.create_anonymous_comment(p_post_id uuid, p_body text)
returns table (id uuid, author_handle text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_handle text;
  v_comment_id uuid;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  select identity.handle into v_handle from public.anonymous_identities identity where identity.user_id = v_user_id;
  if v_handle is null then raise exception 'anonymous_identity_required'; end if;
  if char_length(btrim(p_body)) not between 1 and 2000 then raise exception 'invalid_anonymous_comment'; end if;
  perform public.consume_anonymous_rate_limit('comment', 30, 3600);

  insert into public.anonymous_post_comments (post_id, author_id, author_handle, body)
  values (p_post_id, v_user_id, v_handle, btrim(p_body))
  returning anonymous_post_comments.id into v_comment_id;
  update public.anonymous_posts post set comments_count = post.comments_count + 1 where post.id = p_post_id;

  return query
  select comment.id, comment.author_handle, comment.body, comment.created_at
  from public.anonymous_post_comments comment where comment.id = v_comment_id;
end;
$$;

create or replace function public.create_anonymous_inbox_link()
returns table (token text, enabled boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_identities identity where identity.user_id = v_user_id) then
    raise exception 'anonymous_identity_required';
  end if;
  insert into public.anonymous_inbox_links (owner_id, token)
  values (v_user_id, encode(gen_random_bytes(24), 'hex'))
  on conflict (owner_id) do nothing;
  select link.token into v_token from public.anonymous_inbox_links link where link.owner_id = v_user_id;
  return query select v_token, link.enabled
    from public.anonymous_inbox_links link where link.owner_id = v_user_id;
end;
$$;

create or replace function public.get_anonymous_inbox_link()
returns table (token text, enabled boolean)
language sql
stable
security definer
set search_path = public
as $$
  select link.token, link.enabled
  from public.anonymous_inbox_links link
  where link.owner_id = auth.uid();
$$;

create or replace function public.get_anonymous_inbox_prompt(p_token text)
returns table (enabled boolean)
language sql
stable
security definer
set search_path = public
as $$
  select link.enabled
  from public.anonymous_inbox_links link
  where link.token = p_token;
$$;

create or replace function public.set_anonymous_inbox_link_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  update public.anonymous_inbox_links link set enabled = p_enabled where link.owner_id = v_user_id;
  return found;
end;
$$;

create or replace function public.get_anonymous_inbox_threads()
returns table (id uuid, last_message text, last_message_at timestamptz, message_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  return query
  select thread.id,
    (select message.body from public.anonymous_inbox_messages message
      where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select message.created_at from public.anonymous_inbox_messages message
      where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select count(*) from public.anonymous_inbox_messages message where message.thread_id = thread.id)
  from public.anonymous_inbox_threads thread
  join public.anonymous_inbox_links link on link.id = thread.link_id
  where link.owner_id = auth.uid()
  order by thread.created_at desc
  limit 100;
end;
$$;

create or replace function public.get_anonymous_inbox_messages(p_thread_id uuid)
returns table (id uuid, body text, is_mine boolean, participant_label text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (
    select 1
    from public.anonymous_inbox_threads thread
    join public.anonymous_inbox_links link on link.id = thread.link_id
    where thread.id = p_thread_id and (link.owner_id = v_user_id or thread.sender_id = v_user_id)
  ) then raise exception 'anonymous_thread_forbidden'; end if;

  return query
  select message.id, message.body, message.sender_id = v_user_id, 'Anonymous'::text, message.created_at
  from public.anonymous_inbox_messages message
  where message.thread_id = p_thread_id
  order by message.created_at asc
  limit 200;
end;
$$;

create or replace function public.send_anonymous_inbox_message(p_token text, p_body text)
returns table (thread_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_link_id uuid;
  v_owner_id uuid;
  v_thread_id uuid;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_identities identity where identity.user_id = v_user_id) then
    raise exception 'anonymous_identity_required';
  end if;
  if char_length(btrim(p_body)) not between 1 and 2000 then raise exception 'invalid_anonymous_message'; end if;
  perform public.consume_anonymous_rate_limit('inbox_message', 10, 3600);

  select link.id, link.owner_id into v_link_id, v_owner_id
  from public.anonymous_inbox_links link where link.token = p_token and link.enabled;
  if v_link_id is null then raise exception 'anonymous_inbox_link_unavailable'; end if;
  if v_owner_id = v_user_id then raise exception 'anonymous_inbox_self_message'; end if;
  if exists (
    select 1 from public.anonymous_blocks block
    where (block.blocker_id = v_user_id and block.blocked_id = v_owner_id)
       or (block.blocker_id = v_owner_id and block.blocked_id = v_user_id)
  ) then raise exception 'anonymous_inbox_blocked'; end if;

  insert into public.anonymous_inbox_threads (link_id, sender_id)
  values (v_link_id, v_user_id)
  on conflict (link_id, sender_id) do nothing;
  select thread.id into v_thread_id from public.anonymous_inbox_threads thread
    where thread.link_id = v_link_id and thread.sender_id = v_user_id;
  insert into public.anonymous_inbox_messages (thread_id, sender_id, body)
  values (v_thread_id, v_user_id, btrim(p_body));
  return query select v_thread_id;
end;
$$;

create or replace function public.reply_anonymous_inbox_thread(p_thread_id uuid, p_body text)
returns table (id uuid, body text, is_mine boolean, participant_label text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_message_id uuid;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_identities identity where identity.user_id = v_user_id) then
    raise exception 'anonymous_identity_required';
  end if;
  if char_length(btrim(p_body)) not between 1 and 2000 then raise exception 'invalid_anonymous_message'; end if;
  perform public.consume_anonymous_rate_limit('inbox_reply', 30, 3600);

  select link.owner_id into v_owner_id
  from public.anonymous_inbox_threads thread
  join public.anonymous_inbox_links link on link.id = thread.link_id
  where thread.id = p_thread_id and (link.owner_id = v_user_id or thread.sender_id = v_user_id);
  if v_owner_id is null then raise exception 'anonymous_thread_forbidden'; end if;
  if exists (
    select 1 from public.anonymous_blocks block
    where (block.blocker_id = v_user_id and block.blocked_id = v_owner_id)
       or (block.blocker_id = v_owner_id and block.blocked_id = v_user_id)
  ) then raise exception 'anonymous_inbox_blocked'; end if;

  insert into public.anonymous_inbox_messages (thread_id, sender_id, body)
  values (p_thread_id, v_user_id, btrim(p_body))
  returning anonymous_inbox_messages.id into v_message_id;
  return query
  select message.id, message.body, true, 'Anonymous'::text, message.created_at
  from public.anonymous_inbox_messages message where message.id = v_message_id;
end;
$$;

create or replace function public.share_anonymous_inbox_message(
  p_thread_id uuid,
  p_message_id uuid,
  p_scope text
)
returns table (
  id uuid,
  scope text,
  school text,
  title text,
  body text,
  author_handle text,
  likes_count integer,
  comments_count integer,
  liked_by_me boolean,
  is_mine boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_school text;
  v_body text;
  v_post_id uuid;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if p_scope not in ('school', 'all_nigerian_schools') then raise exception 'invalid_anonymous_scope'; end if;
  perform public.consume_anonymous_rate_limit('inbox_share', 5, 3600);
  if not exists (
    select 1
    from public.anonymous_inbox_threads thread
    join public.anonymous_inbox_links link on link.id = thread.link_id
    where thread.id = p_thread_id and link.owner_id = v_user_id
  ) then raise exception 'anonymous_thread_forbidden'; end if;

  select message.body into v_body from public.anonymous_inbox_messages message
  where message.id = p_message_id and message.thread_id = p_thread_id;
  if v_body is null then raise exception 'anonymous_message_not_found'; end if;
  if p_scope = 'school' then
    select profile.school into v_school from public.profiles profile where profile.id = v_user_id;
    if v_school is null then raise exception 'anonymous_school_required'; end if;
  end if;

  insert into public.anonymous_posts (scope, school, title, body, author_id, author_handle)
  values (p_scope, v_school, 'Shared anonymously', v_body, v_user_id, 'Anonymous')
  returning anonymous_posts.id into v_post_id;
  insert into public.anonymous_post_owners (post_id, owner_id) values (v_post_id, v_user_id);

  return query
  select post.id, post.scope, post.school, post.title, post.body, post.author_handle,
    post.likes_count, post.comments_count, false, true, post.created_at
  from public.anonymous_posts post where post.id = v_post_id;
end;
$$;

create or replace function public.report_anonymous_content(
  p_target_kind text,
  p_target_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  if p_target_kind not in ('post', 'comment', 'message') then raise exception 'invalid_report_target'; end if;
  if char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'invalid_report_reason'; end if;
  perform public.consume_anonymous_rate_limit('report', 20, 3600);
  insert into public.anonymous_reports (reporter_id, target_kind, target_id, reason)
  values (auth.uid(), p_target_kind, p_target_id, btrim(p_reason))
  on conflict (reporter_id, target_kind, target_id) do nothing;
  return true;
end;
$$;

create or replace function public.block_anonymous_thread(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_id uuid;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  select case when link.owner_id = v_user_id then thread.sender_id else link.owner_id end
  into v_other_id
  from public.anonymous_inbox_threads thread
  join public.anonymous_inbox_links link on link.id = thread.link_id
  where thread.id = p_thread_id and (link.owner_id = v_user_id or thread.sender_id = v_user_id);
  if v_other_id is null then raise exception 'anonymous_thread_forbidden'; end if;
  insert into public.anonymous_blocks (blocker_id, blocked_id)
  values (v_user_id, v_other_id)
  on conflict do nothing;
  return true;
end;
$$;

create or replace function public.delete_anonymous_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  delete from public.anonymous_posts post where post.id = p_post_id and post.author_id = auth.uid();
  return found;
end;
$$;

revoke execute on function public.register_anonymous_identity(text) from public, anon;
revoke execute on function public.get_anonymous_identity() from public, anon;
revoke execute on function public.get_anonymous_posts(text, uuid) from public, anon;
revoke execute on function public.create_anonymous_post(text, text, text) from public, anon;
revoke execute on function public.toggle_anonymous_post_like(uuid) from public, anon;
revoke execute on function public.get_anonymous_comments(uuid) from public, anon;
revoke execute on function public.create_anonymous_comment(uuid, text) from public, anon;
revoke execute on function public.create_anonymous_inbox_link() from public, anon;
revoke execute on function public.get_anonymous_inbox_link() from public, anon;
revoke execute on function public.get_anonymous_inbox_prompt(text) from public, anon;
revoke execute on function public.set_anonymous_inbox_link_enabled(boolean) from public, anon;
revoke execute on function public.get_anonymous_inbox_threads() from public, anon;
revoke execute on function public.get_anonymous_inbox_messages(uuid) from public, anon;
revoke execute on function public.send_anonymous_inbox_message(text, text) from public, anon;
revoke execute on function public.reply_anonymous_inbox_thread(uuid, text) from public, anon;
revoke execute on function public.share_anonymous_inbox_message(uuid, uuid, text) from public, anon;
revoke execute on function public.report_anonymous_content(text, uuid, text) from public, anon;
revoke execute on function public.block_anonymous_thread(uuid) from public, anon;
revoke execute on function public.delete_anonymous_post(uuid) from public, anon;

grant execute on function public.register_anonymous_identity(text) to authenticated;
grant execute on function public.get_anonymous_identity() to authenticated;
grant execute on function public.get_anonymous_posts(text, uuid) to authenticated;
grant execute on function public.create_anonymous_post(text, text, text) to authenticated;
grant execute on function public.toggle_anonymous_post_like(uuid) to authenticated;
grant execute on function public.get_anonymous_comments(uuid) to authenticated;
grant execute on function public.create_anonymous_comment(uuid, text) to authenticated;
grant execute on function public.create_anonymous_inbox_link() to authenticated;
grant execute on function public.get_anonymous_inbox_link() to authenticated;
grant execute on function public.get_anonymous_inbox_prompt(text) to authenticated;
grant execute on function public.set_anonymous_inbox_link_enabled(boolean) to authenticated;
grant execute on function public.get_anonymous_inbox_threads() to authenticated;
grant execute on function public.get_anonymous_inbox_messages(uuid) to authenticated;
grant execute on function public.send_anonymous_inbox_message(text, text) to authenticated;
grant execute on function public.reply_anonymous_inbox_thread(uuid, text) to authenticated;
grant execute on function public.share_anonymous_inbox_message(uuid, uuid, text) to authenticated;
grant execute on function public.report_anonymous_content(text, uuid, text) to authenticated;
grant execute on function public.block_anonymous_thread(uuid) to authenticated;
grant execute on function public.delete_anonymous_post(uuid) to authenticated;

revoke all on function public.consume_anonymous_rate_limit(text, integer, integer) from public, anon, authenticated;
