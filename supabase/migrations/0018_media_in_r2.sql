-- Media now lives in Cloudflare R2, not Supabase Storage. The post can no longer check storage.objects;
-- the API route confirms each file exists in R2 (HEAD) before calling this function. Everything else is unchanged:
-- the path must be a reserved upload of this user (or sit in their own anonymous folder).
create or replace function public.create_anonymous_post_with_media(
  p_scope text,
  p_title text,
  p_body text,
  p_media_items jsonb default '[]'::jsonb,
  p_card_theme text default 'blue-hour'
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
  if p_card_theme not in ('blue-hour', 'soft-sky', 'warm-glow', 'rose-note') then raise exception 'invalid_anonymous_card_theme'; end if;
  if char_length(btrim(p_title)) not between 1 and 120 then raise exception 'invalid_anonymous_title'; end if;
  if char_length(btrim(p_body)) not between 1 and 3000 then raise exception 'invalid_anonymous_body'; end if;
  if jsonb_typeof(p_media_items) is distinct from 'array' then
    raise exception 'invalid_anonymous_media';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_media_items) item
    where jsonb_typeof(item) is distinct from 'object'
      or coalesce(item->>'mediaType', '') not in ('photo', 'video')
      or not (
        coalesce(item->>'path', '') ~ (
          '^' || v_user_id::text || '/anonymous/[A-Za-z0-9_.-]+$'
        )
        or (
          coalesce(item->>'path', '') ~ '^anonymous/[0-9a-f-]+\.(jpg|png|webp|mp4|mov|webm)$'
          and exists (
            select 1 from public.anonymous_media_uploads upload
            where upload.object_path = item->>'path'
              and upload.owner_id = v_user_id
              and upload.attached_post_id is null
          )
        )
      )
  ) then
    raise exception 'invalid_anonymous_media';
  end if;

  perform public.consume_anonymous_rate_limit('post', 5, 3600);

  if p_scope = 'school' then
    select profile.school into v_school from public.profiles profile where profile.id = v_user_id;
    if v_school is null then raise exception 'anonymous_school_required'; end if;
  end if;

  insert into public.anonymous_posts (
    scope, school, title, body, author_id, author_handle, media_items, card_theme
  )
  values (p_scope, v_school, btrim(p_title), btrim(p_body), v_user_id, v_handle, p_media_items, p_card_theme)
  returning anonymous_posts.id into v_post_id;
  insert into public.anonymous_post_owners (post_id, owner_id) values (v_post_id, v_user_id);

  update public.anonymous_media_uploads upload
  set attached_post_id = v_post_id
  where upload.owner_id = v_user_id
    and upload.attached_post_id is null
    and upload.object_path in (
      select item->>'path' from jsonb_array_elements(p_media_items) item
    );

  return query
  select * from public.get_anonymous_posts_page(
    case when p_scope = 'school' then 'school' else 'all' end,
    null, null, 1, v_post_id
  );
end;
$$;

revoke all on function public.create_anonymous_post_with_media(text, text, text, jsonb, text) from public, anon;
grant execute on function public.create_anonymous_post_with_media(text, text, text, jsonb, text) to authenticated;
