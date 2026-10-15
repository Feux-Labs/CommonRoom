create index if not exists anonymous_posts_scope_created_id_idx
  on public.anonymous_posts (scope, created_at desc, id desc);
create index if not exists anonymous_posts_school_created_id_idx
  on public.anonymous_posts (school, created_at desc, id desc)
  where scope = 'school';

create or replace function public.get_anonymous_posts_page(
  p_scope text,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 26
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
  if p_limit < 1 or p_limit > 51
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_anonymous_cursor';
  end if;

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
  where (
      p_before_created_at is null
      or (post.created_at, post.id) < (p_before_created_at, p_before_id)
    )
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
  order by post.created_at desc, post.id desc
  limit p_limit;
end;
$$;

revoke execute on function public.get_anonymous_posts_page(text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_anonymous_posts_page(text, timestamptz, uuid, integer) to authenticated;
