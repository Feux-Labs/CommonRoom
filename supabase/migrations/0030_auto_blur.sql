-- Automatic checks may put a click-through warning (a blur with an eye icon) in front of flagged media, like X does.
-- Still nothing is deleted. The flag + warning to the author from 0029 stay as they were.
alter table public.marketplace_listings add column if not exists images_sensitive boolean not null default false;

create or replace function public.apply_media_verdict(p_path text, p_level text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := 'none';
  v_row record;
  v_detail jsonb;
begin
  if p_level not in ('blur', 'remove') then return 'none'; end if;
  select detail into v_detail from public.media_scans where path = p_path;
  v_detail := coalesce(v_detail, '{}'::jsonb) || jsonb_build_object('level', p_level);

  -- Anonymous posts: mark just that photo/video as sensitive.
  update public.anonymous_posts
  set media_items = (
    select coalesce(jsonb_agg(case when item->>'path' = p_path then item || '{"sensitive": true}'::jsonb else item end), '[]'::jsonb)
    from jsonb_array_elements(media_items) item
  )
  where media_items @> jsonb_build_array(jsonb_build_object('path', p_path));

  for v_row in select id from public.anonymous_posts where media_items @> jsonb_build_array(jsonb_build_object('path', p_path)) loop
    if public.flag_content('post', v_row.id, 'media', 'Photo or video may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;

  -- Room posts: same, on the item whose address ends with the file path.
  update public.posts p
  set media_items = (
    select coalesce(jsonb_agg(case when position(p_path in coalesce(item->>'uri', '')) > 0 then item || '{"sensitive": true}'::jsonb else item end), '[]'::jsonb)
    from jsonb_array_elements(p.media_items) item
  )
  where exists (select 1 from jsonb_array_elements(p.media_items) i where position(p_path in coalesce(i->>'uri', '')) > 0);

  for v_row in select p.id from public.posts p where exists (select 1 from jsonb_array_elements(p.media_items) i where position(p_path in coalesce(i->>'uri', '')) > 0) loop
    if public.flag_content('room_post', v_row.id, 'media', 'Photo or video may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;

  -- Listings: the whole photo set is marked sensitive.
  update public.marketplace_listings l set images_sensitive = true
  where l.status <> 'removed' and position(p_path in l.images::text) > 0;

  for v_row in select l.id from public.marketplace_listings l where l.status <> 'removed' and position(p_path in l.images::text) > 0 loop
    if public.flag_content('listing', v_row.id, 'media', 'Photo may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;

  update public.media_scans set action_taken = v_action where path = p_path;
  return v_action;
end;
$$;

revoke all on function public.apply_media_verdict(text, text) from public, anon, authenticated;
grant execute on function public.apply_media_verdict(text, text) to service_role;
