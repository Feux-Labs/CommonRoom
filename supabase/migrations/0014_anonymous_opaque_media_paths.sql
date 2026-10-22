create table if not exists public.anonymous_media_uploads (
  object_path text primary key
    check (object_path ~ '^anonymous/[0-9a-f-]+\.(jpg|png|webp|mp4|mov|webm)$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  attached_post_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.anonymous_media_uploads enable row level security;
grant select on public.anonymous_media_uploads to authenticated;

drop policy if exists "Users read their anonymous media upload paths" on public.anonymous_media_uploads;
create policy "Users read their anonymous media upload paths" on public.anonymous_media_uploads
for select to authenticated using (owner_id = (select auth.uid()));

alter table public.anonymous_posts
  drop constraint if exists anonymous_posts_media_items_check;
alter table public.anonymous_posts
  add column if not exists card_theme text not null default 'blue-hour'
    check (card_theme in ('blue-hour', 'soft-sky', 'warm-glow', 'rose-note'));

drop function if exists public.create_anonymous_post_with_media(text, text, text, jsonb);
drop function if exists public.get_anonymous_posts_page(text, timestamptz, uuid, integer, uuid);
create function public.get_anonymous_posts_page(
  p_scope text,
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
    post.created_at,
    post.media_items,
    post.card_theme
  from public.anonymous_posts post
  where (p_post_id is null or post.id = p_post_id)
    and (
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

create or replace function public.register_anonymous_media_upload(p_extension text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_path text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if p_extension not in ('jpg', 'png', 'webp', 'mp4', 'mov', 'webm') then
    raise exception 'invalid_anonymous_media';
  end if;

  delete from public.anonymous_media_uploads
  where owner_id = v_user_id
    and attached_post_id is null
    and created_at < timezone('utc', now()) - interval '1 day';

  perform public.consume_anonymous_rate_limit('media_upload', 30, 3600);
  v_path := 'anonymous/' || gen_random_uuid()::text || '.' || p_extension;
  insert into public.anonymous_media_uploads (object_path, owner_id)
  values (v_path, v_user_id);
  return v_path;
end;
$$;

drop policy if exists "Users upload media into their own folder" on storage.objects;
create policy "Users upload media into their own folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'post-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.anonymous_media_uploads upload
      where upload.object_path = name
        and upload.owner_id = (select auth.uid())
        and upload.attached_post_id is null
        and upload.created_at > timezone('utc', now()) - interval '1 day'
    )
  )
);

drop policy if exists "Users delete media in their own folder" on storage.objects;
create policy "Users delete media in their own folder" on storage.objects
for delete to authenticated using (
  bucket_id = 'post-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.anonymous_media_uploads upload
      where upload.object_path = name
        and upload.owner_id = (select auth.uid())
        and upload.attached_post_id is null
    )
  )
);

create function public.create_anonymous_post_with_media(
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
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'post-media'
          and object.name = item->>'path'
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

revoke all on function public.register_anonymous_media_upload(text) from public, anon;
grant execute on function public.register_anonymous_media_upload(text) to authenticated;
revoke all on function public.create_anonymous_post_with_media(text, text, text, jsonb, text) from public, anon;
grant execute on function public.create_anonymous_post_with_media(text, text, text, jsonb, text) to authenticated;
revoke all on function public.get_anonymous_posts_page(text, timestamptz, uuid, integer, uuid) from public, anon;
grant execute on function public.get_anonymous_posts_page(text, timestamptz, uuid, integer, uuid) to authenticated;
