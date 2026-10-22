create or replace function public.get_or_create_meet_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then raise exception 'meet_auth_required'; end if;
  if p_other_user_id = v_user_id then raise exception 'meet_self_chat'; end if;

  if not exists (
    select 1
    from public.dating_likes own_like
    join public.dating_likes their_like
      on their_like.from_user_id = own_like.to_user_id
     and their_like.to_user_id = own_like.from_user_id
    join public.profiles me on me.id = v_user_id and me.age_eligibility_confirmed
    join public.profiles them on them.id = p_other_user_id and them.age_eligibility_confirmed
    where own_like.from_user_id = v_user_id
      and own_like.to_user_id = p_other_user_id
  ) then
    raise exception 'meet_mutual_interest_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text),
    0
  ));

  select conversation.id into v_conversation_id
  from public.conversations conversation
  join public.conversation_members mine
    on mine.conversation_id = conversation.id and mine.user_id = v_user_id
  join public.conversation_members other
    on other.conversation_id = conversation.id and other.user_id = p_other_user_id
  where (
    select count(*) from public.conversation_members members
    where members.conversation_id = conversation.id
  ) = 2
  order by conversation.created_at
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations default values returning id into v_conversation_id;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_user_id), (v_conversation_id, p_other_user_id);
  end if;

  return v_conversation_id;
end;
$$;

revoke execute on function public.get_or_create_meet_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_meet_conversation(uuid) to authenticated;
