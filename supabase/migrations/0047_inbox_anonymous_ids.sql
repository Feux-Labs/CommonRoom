-- Inbox conversations now carry Anonymous IDs on both sides, like the feed: the link owner sees the sender's ID and the
-- sender sees the owner's ID. (Real names are never shown.) Same functions, extra columns.
drop function if exists public.get_anonymous_inbox_threads();
create or replace function public.get_anonymous_inbox_threads()
returns table (id uuid, last_message text, last_message_at timestamptz, message_count bigint, participant text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  return query
  select thread.id,
    (select message.body from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select message.created_at from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select count(*) from public.anonymous_inbox_messages message where message.thread_id = thread.id),
    coalesce((select i.handle from public.anonymous_identities i where i.user_id = thread.sender_id), 'Anonymous')
  from public.anonymous_inbox_threads thread
  join public.anonymous_inbox_links link on link.id = thread.link_id
  where link.owner_id = auth.uid()
  order by thread.created_at desc
  limit 100;
end;
$$;
revoke execute on function public.get_anonymous_inbox_threads() from public, anon;
grant execute on function public.get_anonymous_inbox_threads() to authenticated;

drop function if exists public.get_anonymous_sent_threads();
create or replace function public.get_anonymous_sent_threads()
returns table (id uuid, last_message text, last_message_at timestamptz, message_count bigint, participant text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  return query
  select thread.id,
    (select message.body from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select message.created_at from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select count(*) from public.anonymous_inbox_messages message where message.thread_id = thread.id),
    coalesce((select i.handle from public.anonymous_identities i join public.anonymous_inbox_links link on link.owner_id = i.user_id where link.id = thread.link_id), 'Anonymous')
  from public.anonymous_inbox_threads thread
  where thread.sender_id = auth.uid()
  order by thread.created_at desc
  limit 100;
end;
$$;
revoke execute on function public.get_anonymous_sent_threads() from public, anon;
grant execute on function public.get_anonymous_sent_threads() to authenticated;

drop function if exists public.get_anonymous_inbox_messages(uuid);
create or replace function public.get_anonymous_inbox_messages(p_thread_id uuid)
returns table (id uuid, body text, is_mine boolean, participant_label text, created_at timestamptz, other_handle text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_sender uuid;
  v_other text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  select link.owner_id, thread.sender_id into v_owner, v_sender
  from public.anonymous_inbox_threads thread
  join public.anonymous_inbox_links link on link.id = thread.link_id
  where thread.id = p_thread_id and (link.owner_id = v_user_id or thread.sender_id = v_user_id);
  if v_owner is null then raise exception 'anonymous_thread_forbidden'; end if;
  v_other := coalesce((select i.handle from public.anonymous_identities i where i.user_id = case when v_owner = v_user_id then v_sender else v_owner end), 'Anonymous');

  return query
  select message.id, message.body, message.sender_id = v_user_id,
    coalesce((select i.handle from public.anonymous_identities i where i.user_id = message.sender_id), 'Anonymous'),
    message.created_at, v_other
  from public.anonymous_inbox_messages message
  where message.thread_id = p_thread_id
  order by message.created_at asc
  limit 200;
end;
$$;
revoke execute on function public.get_anonymous_inbox_messages(uuid) from public, anon;
grant execute on function public.get_anonymous_inbox_messages(uuid) to authenticated;
