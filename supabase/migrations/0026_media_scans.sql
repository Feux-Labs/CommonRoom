-- Automatic scanning of uploaded photos and videos. Server-only: users never see or edit scan results.
create table if not exists public.media_scans (
  path text primary key check (char_length(path) between 3 and 300),
  owner_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'clean', 'flagged', 'error')),
  level text check (level in ('clean', 'blur', 'remove')),
  detail jsonb,
  action_taken text,
  attempts integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  scanned_at timestamptz
);

create index if not exists media_scans_pending_idx on public.media_scans (created_at) where status in ('pending', 'error');
create index if not exists media_scans_flagged_idx on public.media_scans (scanned_at desc) where status = 'flagged';

alter table public.media_scans enable row level security;
revoke all on public.media_scans from anon, authenticated;

-- Acts on a scan result. 'blur' hides an anonymous post's media behind a tap. 'remove' takes the content down
-- (anonymous post, Room post, or listing) and tells its owner. No strike is given automatically: a person reviews that.
create or replace function public.apply_media_verdict(p_path text, p_level text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := 'none';
  v_owner uuid;
  v_count integer;
begin
  if p_level not in ('blur', 'remove') then return 'none'; end if;
  select owner_id into v_owner from public.media_scans where path = p_path;

  if p_level = 'blur' then
    update public.anonymous_posts
    set media_items = (
      select coalesce(jsonb_agg(case when item->>'path' = p_path then item || '{"sensitive": true}'::jsonb else item end), '[]'::jsonb)
      from jsonb_array_elements(media_items) item
    )
    where media_items @> jsonb_build_array(jsonb_build_object('path', p_path));
    get diagnostics v_count = row_count;
    if v_count > 0 then v_action := 'blurred'; end if;
  else
    delete from public.anonymous_posts where media_items @> jsonb_build_array(jsonb_build_object('path', p_path));
    get diagnostics v_count = row_count;
    if v_count > 0 then v_action := 'removed'; end if;

    delete from public.posts p
    where exists (select 1 from jsonb_array_elements(p.media_items) i where position(p_path in coalesce(i->>'uri', '')) > 0);
    get diagnostics v_count = row_count;
    if v_count > 0 then v_action := 'removed'; end if;

    update public.marketplace_listings l
    set status = 'removed', updated_at = timezone('utc', now())
    where l.status <> 'removed' and position(p_path in l.images::text) > 0;
    get diagnostics v_count = row_count;
    if v_count > 0 then v_action := 'removed'; end if;

    if v_action = 'removed' and v_owner is not null then
      begin
        insert into public.notifications (user_id, kind, title, link)
        values (v_owner, 'system', 'We removed a post because a photo or video looked like it broke our rules on explicit content. If that was a mistake, contact support.', '/guidelines');
      exception when others then null;
      end;
    end if;
  end if;

  update public.media_scans set action_taken = v_action where path = p_path;
  return v_action;
end;
$$;

revoke all on function public.apply_media_verdict(text, text) from public, anon, authenticated;
grant execute on function public.apply_media_verdict(text, text) to service_role;
