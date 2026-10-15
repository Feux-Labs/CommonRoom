-- Room: social feed ranking, stories, threaded comments, chat, invites, public profiles

alter table public.profiles
  add column if not exists bio text not null default '' check (char_length(bio) <= 280),
  add column if not exists avatar_url text;

alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;

create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  event_type text not null check (event_type in (
    'impression', 'open', 'watch_complete', 'like', 'comment', 'share', 'save', 'skip', 'send'
  )),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invites (
  code text primary key check (char_length(code) between 6 and 16),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  use_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (inviter_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists posts_school_created_idx on public.posts (school_label, created_at desc, id desc);
create index if not exists posts_media_created_idx on public.posts (media_type, created_at desc);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists post_comments_parent_idx on public.post_comments (parent_id);
create index if not exists post_shares_post_idx on public.post_shares (post_id);
create index if not exists room_events_user_created_idx on public.room_events (user_id, created_at desc);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);
create index if not exists direct_messages_convo_idx on public.direct_messages (conversation_id, created_at);
create index if not exists profiles_username_idx on public.profiles (username);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Authenticated users read profiles" on public.profiles
for select to authenticated using (true);
create policy "Users insert their own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "Users update their own profile" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter table public.post_saves enable row level security;
alter table public.post_shares enable row level security;
alter table public.post_reports enable row level security;
alter table public.room_events enable row level security;
alter table public.invites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages enable row level security;

create policy "Users read saves on visible posts" on public.post_saves
for select to authenticated using (exists (select 1 from public.posts where posts.id = post_saves.post_id));
create policy "Users manage their saves" on public.post_saves
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users read share counts" on public.post_shares
for select to authenticated using (exists (select 1 from public.posts where posts.id = post_shares.post_id));
create policy "Users record their shares" on public.post_shares
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users file post reports" on public.post_reports
for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "Users read their post reports" on public.post_reports
for select to authenticated using (reporter_id = (select auth.uid()));

create policy "Users write their room events" on public.room_events
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users read their room events" on public.room_events
for select to authenticated using (user_id = (select auth.uid()));

create policy "Authenticated users read invites" on public.invites
for select to authenticated using (true);
create policy "Users create own invite" on public.invites
for insert to authenticated with check (inviter_id = (select auth.uid()));
create policy "Users update own invite" on public.invites
for update to authenticated using (inviter_id = (select auth.uid()));

create or replace function public.redeem_room_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inviter uuid;
begin
  if v_user_id is null then raise exception 'room_auth_required'; end if;
  select inviter_id into v_inviter from public.invites where code = lower(trim(p_code));
  if v_inviter is null then raise exception 'invite_not_found'; end if;
  if v_inviter = v_user_id then raise exception 'invite_self'; end if;

  insert into public.follows (follower_id, following_id)
  values (v_user_id, v_inviter)
  on conflict do nothing;
  insert into public.follows (follower_id, following_id)
  values (v_inviter, v_user_id)
  on conflict do nothing;
  update public.invites set use_count = use_count + 1 where code = lower(trim(p_code));
  return v_inviter;
end;
$$;

revoke execute on function public.redeem_room_invite(text) from public, anon;
grant execute on function public.redeem_room_invite(text) to authenticated;

create policy "Members read conversations" on public.conversations
for select to authenticated using (exists (
  select 1 from public.conversation_members
  where conversation_members.conversation_id = conversations.id
    and conversation_members.user_id = (select auth.uid())
));
create policy "Users create conversations" on public.conversations
for insert to authenticated with check (true);
create policy "Members update conversations" on public.conversations
for update to authenticated using (exists (
  select 1 from public.conversation_members
  where conversation_members.conversation_id = conversations.id
    and conversation_members.user_id = (select auth.uid())
));

create policy "Users read memberships they share" on public.conversation_members
for select to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.conversation_members mine
    where mine.conversation_id = conversation_members.conversation_id
      and mine.user_id = (select auth.uid())
  )
);
create policy "Users add themselves to conversations" on public.conversation_members
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Members read messages" on public.direct_messages
for select to authenticated using (exists (
  select 1 from public.conversation_members
  where conversation_members.conversation_id = direct_messages.conversation_id
    and conversation_members.user_id = (select auth.uid())
));
create policy "Members send messages" on public.direct_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members
    where conversation_members.conversation_id = direct_messages.conversation_id
      and conversation_members.user_id = (select auth.uid())
  )
);

create or replace function public.room_post_score(
  p_likes integer,
  p_comments integer,
  p_shares integer,
  p_created_at timestamptz,
  p_same_school boolean,
  p_following boolean
) returns numeric
language sql
immutable
as $$
  select
    (coalesce(p_likes, 0) * 2)
    + (coalesce(p_comments, 0) * 3)
    + (coalesce(p_shares, 0) * 4)
    + case
        when p_created_at > timezone('utc', now()) - interval '6 hours' then 14
        when p_created_at > timezone('utc', now()) - interval '24 hours' then 8
        when p_created_at > timezone('utc', now()) - interval '7 days' then 3
        else 0
      end
    + case when p_same_school then 10 else 0 end
    + case when p_following then 6 else 0 end
    + case when p_likes + p_comments < 3 and p_created_at > timezone('utc', now()) - interval '12 hours' then 4 else 0 end;
$$;

create or replace function public.get_room_feed_page(
  p_scope text,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 13
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  school_label text,
  caption text,
  poll_options text[],
  media_items jsonb,
  media_type text,
  location text,
  audience text,
  age_restricted boolean,
  allow_comments boolean,
  allow_reuse boolean,
  created_at timestamptz,
  likes_count integer,
  comments_count integer,
  saves_count integer,
  shares_count integer,
  liked_by_me boolean,
  saved_by_me boolean,
  score numeric
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
  if v_user_id is null then raise exception 'room_auth_required'; end if;
  if p_scope not in ('for_you', 'general', 'following') then raise exception 'invalid_room_scope'; end if;
  if p_limit < 1 or p_limit > 40
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_room_cursor';
  end if;

  select profile.school into v_school from public.profiles profile where profile.id = v_user_id;

  return query
  with ranked as (
    select
      post.id,
      post.author_id,
      post.author_name,
      post.author_username,
      author.avatar_url as author_avatar,
      post.school_label,
      post.caption,
      post.poll_options,
      post.media_items,
      post.media_type,
      post.location,
      post.audience,
      post.age_restricted,
      post.allow_comments,
      post.allow_reuse,
      post.created_at,
      coalesce((select count(*) from public.post_likes likes where likes.post_id = post.id), 0)::integer as likes_count,
      coalesce((select count(*) from public.post_comments comments where comments.post_id = post.id), 0)::integer as comments_count,
      coalesce((select count(*) from public.post_saves saves where saves.post_id = post.id), 0)::integer as saves_count,
      coalesce((select count(*) from public.post_shares shares where shares.post_id = post.id), 0)::integer as shares_count,
      exists (select 1 from public.post_likes likes where likes.post_id = post.id and likes.user_id = v_user_id) as liked_by_me,
      exists (select 1 from public.post_saves saves where saves.post_id = post.id and saves.user_id = v_user_id) as saved_by_me,
      exists (select 1 from public.follows follows where follows.follower_id = v_user_id and follows.following_id = post.author_id) as is_following,
      public.room_post_score(
        coalesce((select count(*) from public.post_likes likes where likes.post_id = post.id), 0)::integer,
        coalesce((select count(*) from public.post_comments comments where comments.post_id = post.id), 0)::integer,
        coalesce((select count(*) from public.post_shares shares where shares.post_id = post.id), 0)::integer,
        post.created_at,
        v_school is not null and post.school_label is not null and post.school_label = v_school,
        exists (select 1 from public.follows follows where follows.follower_id = v_user_id and follows.following_id = post.author_id)
      ) as score
    from public.posts post
    left join public.profiles author on author.id = post.author_id
    where (
      post.author_id = v_user_id
      or post.audience = 'Public'
      or (post.audience = 'Followers' and exists (
        select 1 from public.follows follows
        where follows.follower_id = v_user_id and follows.following_id = post.author_id
      ))
    )
    and (
      (p_scope = 'for_you' and (
        (v_school is not null and post.school_label = v_school)
        or (v_school is null and (
          exists (select 1 from public.follows follows where follows.follower_id = v_user_id and follows.following_id = post.author_id)
          or post.created_at > timezone('utc', now()) - interval '14 days'
        ))
      ))
      or (p_scope = 'general' and (v_school is null or post.school_label is distinct from v_school))
      or (p_scope = 'following' and exists (
        select 1 from public.follows follows
        where follows.follower_id = v_user_id and follows.following_id = post.author_id
      ))
    )
    and (
      p_before_created_at is null
      or (post.created_at, post.id) < (p_before_created_at, p_before_id)
    )
  )
  select
    ranked.id,
    ranked.author_id,
    ranked.author_name,
    ranked.author_username,
    ranked.author_avatar,
    ranked.school_label,
    ranked.caption,
    ranked.poll_options,
    ranked.media_items,
    ranked.media_type,
    ranked.location,
    ranked.audience,
    ranked.age_restricted,
    ranked.allow_comments,
    ranked.allow_reuse,
    ranked.created_at,
    ranked.likes_count,
    ranked.comments_count,
    ranked.saves_count,
    ranked.shares_count,
    ranked.liked_by_me,
    ranked.saved_by_me,
    ranked.score
  from ranked
  order by
    case when p_scope = 'following' then ranked.created_at end desc nulls last,
    ranked.score desc,
    ranked.created_at desc,
    ranked.id desc
  limit p_limit;
end;
$$;

revoke execute on function public.get_room_feed_page(text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_room_feed_page(text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.room_post_score(integer, integer, integer, timestamptz, boolean, boolean) to authenticated;
