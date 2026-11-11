-- Lets a sender find the conversations they started (to read replies when they come back). Returns only threads
-- where the caller is the sender, and never the owner's identity.
create or replace function public.get_anonymous_sent_threads()
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
    (select message.body from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select message.created_at from public.anonymous_inbox_messages message where message.thread_id = thread.id order by message.created_at desc limit 1),
    (select count(*) from public.anonymous_inbox_messages message where message.thread_id = thread.id)
  from public.anonymous_inbox_threads thread
  where thread.sender_id = auth.uid()
  order by thread.created_at desc
  limit 100;
end;
$$;
revoke execute on function public.get_anonymous_sent_threads() from public, anon;
grant execute on function public.get_anonymous_sent_threads() to authenticated;
