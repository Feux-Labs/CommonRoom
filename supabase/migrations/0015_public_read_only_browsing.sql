create or replace function public.get_public_room_feed_page(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 13,
  p_post_id uuid default null
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
begin
  if p_limit < 1 or p_limit > 40
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_room_cursor';
  end if;

  return query
  select
    post.id,
    post.author_id,
    post.author_name,
    post.author_username,
    author.avatar_url,
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
    (select count(*)::integer from public.post_likes likes where likes.post_id = post.id),
    (select count(*)::integer from public.post_comments comments where comments.post_id = post.id),
    0::integer,
    (select count(*)::integer from public.post_shares shares where shares.post_id = post.id),
    false,
    false,
    0::numeric
  from public.posts post
  left join public.profiles author on author.id = post.author_id
  where (p_post_id is null or post.id = p_post_id)
    and post.audience = 'Public'
    and not post.age_restricted
    and (
      p_before_created_at is null
      or (post.created_at, post.id) < (p_before_created_at, p_before_id)
    )
  order by post.created_at desc, post.id desc
  limit p_limit;
end;
$$;

revoke execute on function public.get_public_room_feed_page(timestamptz, uuid, integer, uuid) from public;
grant execute on function public.get_public_room_feed_page(timestamptz, uuid, integer, uuid) to anon, authenticated;

create or replace function public.get_public_anonymous_posts_page(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 26,
  p_post_id uuid default null
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
  created_at timestamptz,
  media_items jsonb,
  card_theme text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 51
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_anonymous_cursor';
  end if;

  return query
  select
    post.id,
    post.scope,
    null::text,
    post.title,
    post.body,
    post.author_handle,
    post.likes_count,
    post.comments_count,
    false,
    false,
    post.created_at,
    post.media_items,
    post.card_theme
  from public.anonymous_posts post
  where post.scope = 'all_nigerian_schools'
    and (p_post_id is null or post.id = p_post_id)
    and (
      p_before_created_at is null
      or (post.created_at, post.id) < (p_before_created_at, p_before_id)
    )
  order by post.created_at desc, post.id desc
  limit p_limit;
end;
$$;

revoke execute on function public.get_public_anonymous_posts_page(timestamptz, uuid, integer, uuid) from public;
grant execute on function public.get_public_anonymous_posts_page(timestamptz, uuid, integer, uuid) to anon, authenticated;

create or replace function public.get_public_meet_profiles()
returns table (
  user_id uuid,
  display_name text,
  school text,
  bio text,
  interests text[],
  photo_urls text[],
  username text,
  course text,
  year text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    meet.user_id,
    meet.display_name,
    meet.school,
    meet.bio,
    meet.interests,
    meet.photo_urls,
    profile.username,
    profile.course,
    profile.year,
    profile.avatar_url
  from public.dating_profiles meet
  join public.profiles profile on profile.id = meet.user_id
  where meet.discoverable
    and profile.age_eligibility_confirmed
  order by meet.updated_at desc
  limit 40;
$$;

revoke execute on function public.get_public_meet_profiles() from public;
grant execute on function public.get_public_meet_profiles() to anon, authenticated;
