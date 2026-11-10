-- The Anonymous feed is one feed built from several feeds (everyone in Nigeria, plus your own school) and ranked by
-- how "hot" each post is. Existing functions are untouched; the app opts in with sort=hot.
--
-- hot score = (likes + 2 * comments + 1) / (hours old + 2) ^ 1.6, over the last 30 days.
-- Paging is stable: the first page fixes `as_of`, and every later page is scored at that same moment, so posts never
-- jump around or repeat while scrolling. New posts show up when the feed is refreshed. The rank is an integer so the
-- cursor survives a round trip through JSON exactly.

create or replace function public.get_hot_anonymous_posts_page(
  p_as_of timestamptz default null,
  p_before_rank bigint default null,
  p_before_id uuid default null,
  p_limit integer default 26
)
returns table (
  id uuid, scope text, school text, title text, body text, author_handle text,
  likes_count integer, comments_count integer, liked_by_me boolean, is_mine boolean,
  created_at timestamptz, media_items jsonb, card_theme text, hot_rank bigint, as_of timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_school text;
  v_as_of timestamptz := coalesce(p_as_of, now());
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if p_limit < 1 or p_limit > 51 or ((p_before_rank is null) <> (p_before_id is null)) then
    raise exception 'invalid_anonymous_cursor';
  end if;
  select profile.school into v_school from public.profiles profile where profile.id = v_user_id;

  return query
  select ranked.id, ranked.scope, ranked.school, ranked.title, ranked.body, ranked.author_handle,
    ranked.likes_count, ranked.comments_count, ranked.liked_by_me, ranked.is_mine,
    ranked.created_at, ranked.media_items, ranked.card_theme, ranked.hot_rank, v_as_of
  from (
    select post.id, post.scope, post.school, post.title, post.body, post.author_handle,
      post.likes_count, post.comments_count,
      exists (select 1 from public.anonymous_post_likes likes where likes.post_id = post.id and likes.identity_id = v_user_id) as liked_by_me,
      (post.author_id = v_user_id) as is_mine,
      post.created_at, post.media_items, post.card_theme,
      floor(
        ((post.likes_count + 2 * post.comments_count + 1)::double precision
          / power(extract(epoch from (v_as_of - post.created_at)) / 3600.0 + 2.0, 1.6)) * 1e9
      )::bigint as hot_rank
    from public.anonymous_posts post
    where post.created_at <= v_as_of
      and post.created_at > v_as_of - interval '30 days'
      and (post.scope = 'all_nigerian_schools' or (post.scope = 'school' and v_school is not null and post.school = v_school))
      and not exists (
        select 1 from public.anonymous_post_owners owner
        join public.anonymous_blocks block on block.blocker_id = v_user_id and block.blocked_id = owner.owner_id
        where owner.post_id = post.id
      )
  ) ranked
  where p_before_rank is null or (ranked.hot_rank, ranked.id) < (p_before_rank, p_before_id)
  order by ranked.hot_rank desc, ranked.id desc
  limit p_limit;
end;
$$;

-- Signed-out visitors see the nationwide part of the feed, ranked the same way.
create or replace function public.get_public_hot_anonymous_posts_page(
  p_as_of timestamptz default null,
  p_before_rank bigint default null,
  p_before_id uuid default null,
  p_limit integer default 26
)
returns table (
  id uuid, scope text, school text, title text, body text, author_handle text,
  likes_count integer, comments_count integer, liked_by_me boolean, is_mine boolean,
  created_at timestamptz, media_items jsonb, card_theme text, hot_rank bigint, as_of timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_as_of timestamptz := coalesce(p_as_of, now());
begin
  if p_limit < 1 or p_limit > 51 or ((p_before_rank is null) <> (p_before_id is null)) then
    raise exception 'invalid_anonymous_cursor';
  end if;

  return query
  select ranked.id, ranked.scope, null::text, ranked.title, ranked.body, ranked.author_handle,
    ranked.likes_count, ranked.comments_count, false, false,
    ranked.created_at, ranked.media_items, ranked.card_theme, ranked.hot_rank, v_as_of
  from (
    select post.id, post.scope, post.title, post.body, post.author_handle, post.likes_count, post.comments_count,
      post.created_at, post.media_items, post.card_theme,
      floor(
        ((post.likes_count + 2 * post.comments_count + 1)::double precision
          / power(extract(epoch from (v_as_of - post.created_at)) / 3600.0 + 2.0, 1.6)) * 1e9
      )::bigint as hot_rank
    from public.anonymous_posts post
    where post.scope = 'all_nigerian_schools'
      and post.created_at <= v_as_of
      and post.created_at > v_as_of - interval '30 days'
  ) ranked
  where p_before_rank is null or (ranked.hot_rank, ranked.id) < (p_before_rank, p_before_id)
  order by ranked.hot_rank desc, ranked.id desc
  limit p_limit;
end;
$$;

revoke all on function public.get_hot_anonymous_posts_page(timestamptz, bigint, uuid, integer) from public, anon;
grant execute on function public.get_hot_anonymous_posts_page(timestamptz, bigint, uuid, integer) to authenticated;
revoke all on function public.get_public_hot_anonymous_posts_page(timestamptz, bigint, uuid, integer) from public;
grant execute on function public.get_public_hot_anonymous_posts_page(timestamptz, bigint, uuid, integer) to anon, authenticated;
