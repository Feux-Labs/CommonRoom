-- In-app notifications: likes, comments, replies, follows and anonymous inbox messages.
-- Created by database triggers so every path (web, future apps) notifies the same way. Triggers never block the
-- action that caused them: any error inside is swallowed. Anonymous kinds never store who the other person is.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like', 'comment', 'reply', 'follow', 'anon_comment', 'anon_reply', 'inbox_message')),
  actor_id uuid references auth.users(id) on delete cascade,
  actor_name text,
  post_id uuid references public.posts(id) on delete cascade,
  anon_post_id uuid references public.anonymous_posts(id) on delete cascade,
  thread_id uuid references public.anonymous_inbox_threads(id) on delete cascade,
  preview text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users mark their notifications read" on public.notifications;
create policy "Users mark their notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Users clear their notifications" on public.notifications;
create policy "Users clear their notifications" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- Likes on a Room post -> its author.
create or replace function public.notify_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  begin
    select author_id into v_author from public.posts where id = new.post_id;
    if v_author is not null and v_author <> new.user_id then
      insert into public.notifications (user_id, kind, actor_id, actor_name, post_id)
      values (v_author, 'like', new.user_id, (select display_name from public.profiles where id = new.user_id), new.post_id);
    end if;
  exception when others then null;
  end;
  return new;
end; $$;

-- Comments on a Room post -> its author; replies -> the comment being replied to.
create or replace function public.notify_post_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_parent_author uuid; v_name text;
begin
  begin
    select author_id into v_author from public.posts where id = new.post_id;
    select display_name into v_name from public.profiles where id = new.author_id;
    if new.parent_id is not null then
      select author_id into v_parent_author from public.post_comments where id = new.parent_id;
      if v_parent_author is not null and v_parent_author <> new.author_id then
        insert into public.notifications (user_id, kind, actor_id, actor_name, post_id, preview)
        values (v_parent_author, 'reply', new.author_id, v_name, new.post_id, left(new.body, 80));
      end if;
    end if;
    if v_author is not null and v_author <> new.author_id and v_author is distinct from v_parent_author then
      insert into public.notifications (user_id, kind, actor_id, actor_name, post_id, preview)
      values (v_author, 'comment', new.author_id, v_name, new.post_id, left(new.body, 80));
    end if;
  exception when others then null;
  end;
  return new;
end; $$;

-- New follower -> the person followed.
create or replace function public.notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.following_id <> new.follower_id then
      insert into public.notifications (user_id, kind, actor_id, actor_name)
      values (new.following_id, 'follow', new.follower_id, (select display_name from public.profiles where id = new.follower_id));
    end if;
  exception when others then null;
  end;
  return new;
end; $$;

-- Comments on an anonymous post -> its author. No actor is stored: the commenter stays anonymous.
create or replace function public.notify_anonymous_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_parent_author uuid;
begin
  begin
    select author_id into v_author from public.anonymous_posts where id = new.post_id;
    if new.parent_comment_id is not null then
      select author_id into v_parent_author from public.anonymous_post_comments where id = new.parent_comment_id;
      if v_parent_author is not null and v_parent_author <> new.author_id then
        insert into public.notifications (user_id, kind, anon_post_id, preview)
        values (v_parent_author, 'anon_reply', new.post_id, left(new.body, 80));
      end if;
    end if;
    if v_author is not null and v_author <> new.author_id and v_author is distinct from v_parent_author then
      insert into public.notifications (user_id, kind, anon_post_id, preview)
      values (v_author, 'anon_comment', new.post_id, left(new.body, 80));
    end if;
  exception when others then null;
  end;
  return new;
end; $$;

-- New private message in an inbox thread -> the other person in the thread.
create or replace function public.notify_inbox_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sender uuid; v_owner uuid; v_to uuid;
begin
  begin
    select t.sender_id, l.owner_id into v_sender, v_owner
    from public.anonymous_inbox_threads t join public.anonymous_inbox_links l on l.id = t.link_id
    where t.id = new.thread_id;
    v_to := case when new.sender_id = v_sender then v_owner else v_sender end;
    if v_to is not null and v_to <> new.sender_id then
      insert into public.notifications (user_id, kind, thread_id, preview)
      values (v_to, 'inbox_message', new.thread_id, left(new.body, 80));
    end if;
  exception when others then null;
  end;
  return new;
end; $$;

drop trigger if exists notify_post_like on public.post_likes;
create trigger notify_post_like after insert on public.post_likes for each row execute function public.notify_post_like();
drop trigger if exists notify_post_comment on public.post_comments;
create trigger notify_post_comment after insert on public.post_comments for each row execute function public.notify_post_comment();
drop trigger if exists notify_follow on public.follows;
create trigger notify_follow after insert on public.follows for each row execute function public.notify_follow();
drop trigger if exists notify_anonymous_comment on public.anonymous_post_comments;
create trigger notify_anonymous_comment after insert on public.anonymous_post_comments for each row execute function public.notify_anonymous_comment();
drop trigger if exists notify_inbox_message on public.anonymous_inbox_messages;
create trigger notify_inbox_message after insert on public.anonymous_inbox_messages for each row execute function public.notify_inbox_message();

revoke all on function public.notify_post_like(), public.notify_post_comment(), public.notify_follow(),
  public.notify_anonymous_comment(), public.notify_inbox_message() from public, anon, authenticated;
