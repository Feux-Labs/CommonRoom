alter table public.anonymous_post_comments
  add column if not exists parent_comment_id uuid
  references public.anonymous_post_comments(id) on delete cascade;

create index if not exists anonymous_post_comments_parent_created_at_idx
  on public.anonymous_post_comments (parent_comment_id, created_at)
  where parent_comment_id is not null;

drop function if exists public.get_anonymous_comments(uuid);

create function public.get_anonymous_comments(p_post_id uuid)
returns table (
  id uuid,
  parent_comment_id uuid,
  author_handle text,
  body text,
  created_at timestamptz
)
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
  select comment.id, comment.parent_comment_id, comment.author_handle, comment.body, comment.created_at
  from public.anonymous_post_comments comment
  where comment.post_id = p_post_id
  order by comment.created_at asc, comment.id asc
  limit 500;
end;
$$;

drop function if exists public.create_anonymous_comment(uuid, text);

create function public.create_anonymous_comment(
  p_post_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns table (
  id uuid,
  parent_comment_id uuid,
  author_handle text,
  body text,
  created_at timestamptz
)
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
  select identity.handle into v_handle
  from public.anonymous_identities identity
  where identity.user_id = v_user_id;
  if v_handle is null then raise exception 'anonymous_identity_required'; end if;
  if char_length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'invalid_anonymous_comment';
  end if;
  if not exists (select 1 from public.anonymous_posts post where post.id = p_post_id) then
    raise exception 'anonymous_post_not_found';
  end if;
  if p_parent_comment_id is not null and not exists (
    select 1
    from public.anonymous_post_comments parent
    where parent.id = p_parent_comment_id
      and parent.post_id = p_post_id
      and parent.parent_comment_id is null
  ) then
    raise exception 'invalid_anonymous_comment_parent';
  end if;

  perform public.consume_anonymous_rate_limit('comment', 30, 3600);

  insert into public.anonymous_post_comments (
    post_id, parent_comment_id, author_id, author_handle, body
  )
  values (p_post_id, p_parent_comment_id, v_user_id, v_handle, btrim(p_body))
  returning anonymous_post_comments.id into v_comment_id;

  update public.anonymous_posts post
  set comments_count = post.comments_count + 1
  where post.id = p_post_id;

  return query
  select comment.id, comment.parent_comment_id, comment.author_handle, comment.body, comment.created_at
  from public.anonymous_post_comments comment
  where comment.id = v_comment_id;
end;
$$;

revoke execute on function public.get_anonymous_comments(uuid) from public, anon;
revoke execute on function public.create_anonymous_comment(uuid, text, uuid) from public, anon;
grant execute on function public.get_anonymous_comments(uuid) to authenticated;
grant execute on function public.create_anonymous_comment(uuid, text, uuid) to authenticated;
