-- Automatic checks (Gemini) can only FLAG content for a moderator and WARN its author. They never delete or hide anything.
-- A person decides in the report queue (dismiss, remove, or remove + strike).
create table if not exists public.auto_flags (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('post', 'room_post', 'listing')),
  target_id uuid not null,
  source text not null check (source in ('media', 'text')),
  reason text not null check (char_length(reason) between 1 and 300),
  detail jsonb,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  unique (target_kind, target_id, source)
);

create index if not exists auto_flags_open_idx on public.auto_flags (created_at desc) where status = 'open';
alter table public.auto_flags enable row level security;
revoke all on public.auto_flags from anon, authenticated;

-- Records a flag on a piece of content and warns its author once. Nothing about the content changes.
create or replace function public.flag_content(p_kind text, p_id uuid, p_source text, p_reason text, p_detail jsonb default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_count integer;
begin
  if p_kind not in ('post', 'room_post', 'listing') or p_source not in ('media', 'text') then return 'ignored'; end if;

  if p_kind = 'post' then select author_id into v_author from public.anonymous_posts where id = p_id;
  elsif p_kind = 'room_post' then select author_id into v_author from public.posts where id = p_id;
  else select seller_id into v_author from public.marketplace_listings where id = p_id;
  end if;
  if v_author is null then return 'ignored'; end if;

  insert into public.auto_flags (target_kind, target_id, source, reason, detail)
  values (p_kind, p_id, p_source, left(p_reason, 300), p_detail)
  on conflict (target_kind, target_id, source) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then return 'already'; end if;

  begin
    insert into public.notifications (user_id, kind, title, link)
    values (v_author, 'system', 'Heads up: something you posted may break our community rules. A moderator will take a look. Please read the guidelines.', '/guidelines');
  exception when others then null;
  end;
  return 'flagged';
end;
$$;

-- A scanned file was flagged: find what it belongs to and flag that. (Replaces the earlier version that hid/removed it.)
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

  for v_row in select id from public.anonymous_posts where media_items @> jsonb_build_array(jsonb_build_object('path', p_path)) loop
    if public.flag_content('post', v_row.id, 'media', 'Photo or video may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;
  for v_row in select p.id from public.posts p where exists (select 1 from jsonb_array_elements(p.media_items) i where position(p_path in coalesce(i->>'uri', '')) > 0) loop
    if public.flag_content('room_post', v_row.id, 'media', 'Photo or video may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;
  for v_row in select l.id from public.marketplace_listings l where l.status <> 'removed' and position(p_path in l.images::text) > 0 loop
    if public.flag_content('listing', v_row.id, 'media', 'Photo may be explicit or graphic', v_detail) = 'flagged' then v_action := 'flagged'; end if;
  end loop;

  update public.media_scans set action_taken = v_action where path = p_path;
  return v_action;
end;
$$;

-- The moderator queue now also lists automatic flags (source 'auto'). Existing sources are unchanged.
create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  report_id uuid, source text, target_kind text, target_id uuid, reason text, reported_at timestamptz,
  preview text, author_id uuid, report_count bigint, author_strikes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with open_reports as (
    select r.id as report_id, 'anonymous'::text as source, r.target_kind, r.target_id, r.reason, r.created_at as reported_at,
      case r.target_kind
        when 'post' then (select left(p.title || ': ' || p.body, 300) from public.anonymous_posts p where p.id = r.target_id)
        when 'comment' then (select left(c.body, 300) from public.anonymous_post_comments c where c.id = r.target_id)
        when 'message' then (select left(m.body, 300) from public.anonymous_inbox_messages m where m.id = r.target_id)
      end as preview,
      case r.target_kind
        when 'post' then (select p.author_id from public.anonymous_posts p where p.id = r.target_id)
        when 'comment' then (select c.author_id from public.anonymous_post_comments c where c.id = r.target_id)
        when 'message' then (select m.sender_id from public.anonymous_inbox_messages m where m.id = r.target_id)
      end as author_id
    from public.anonymous_reports r where r.status = 'open'
    union all
    select r.id, 'room', 'room_post', r.post_id, r.reason, r.created_at,
      (select left(coalesce(p.caption, ''), 300) from public.posts p where p.id = r.post_id),
      (select p.author_id from public.posts p where p.id = r.post_id)
    from public.post_reports r where r.status = 'open'
    union all
    select r.id, 'marketplace', 'listing', r.listing_id, r.reason, r.created_at,
      (select left(l.title || ' - ' || l.description, 300) from public.marketplace_listings l where l.id = r.listing_id),
      (select l.seller_id from public.marketplace_listings l where l.id = r.listing_id)
    from public.marketplace_reports r where r.status = 'pending'
    union all
    select f.id, 'auto', f.target_kind, f.target_id, 'Automatic check: ' || f.reason, f.created_at,
      case f.target_kind
        when 'post' then (select left(p.title || ': ' || p.body, 300) from public.anonymous_posts p where p.id = f.target_id)
        when 'room_post' then (select left(coalesce(p.caption, ''), 300) from public.posts p where p.id = f.target_id)
        when 'listing' then (select left(l.title || ' - ' || l.description, 300) from public.marketplace_listings l where l.id = f.target_id)
      end,
      case f.target_kind
        when 'post' then (select p.author_id from public.anonymous_posts p where p.id = f.target_id)
        when 'room_post' then (select p.author_id from public.posts p where p.id = f.target_id)
        when 'listing' then (select l.seller_id from public.marketplace_listings l where l.id = f.target_id)
      end
    from public.auto_flags f where f.status = 'open'
  )
  select o.report_id, o.source, o.target_kind, o.target_id, o.reason, o.reported_at, o.preview, o.author_id,
    count(*) over (partition by o.target_kind, o.target_id) as report_count,
    (select count(*) from public.user_restrictions x where x.user_id = o.author_id) as author_strikes
  from open_reports o
  where o.preview is not null
  order by report_count desc, o.reported_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

create or replace function public.resolve_report(p_source text, p_report_id uuid, p_action text, p_admin text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text; v_target uuid; v_reason text; v_author uuid; v_strike record; v_result jsonb := '{}'::jsonb;
begin
  if p_action not in ('dismiss', 'remove', 'remove_strike') then raise exception 'invalid_action'; end if;

  if p_source = 'anonymous' then
    select r.target_kind, r.target_id, r.reason into v_kind, v_target, v_reason from public.anonymous_reports r where r.id = p_report_id and r.status = 'open';
  elsif p_source = 'room' then
    select 'room_post', r.post_id, r.reason into v_kind, v_target, v_reason from public.post_reports r where r.id = p_report_id and r.status = 'open';
  elsif p_source = 'marketplace' then
    select 'listing', r.listing_id, r.reason into v_kind, v_target, v_reason from public.marketplace_reports r where r.id = p_report_id and r.status = 'pending';
  elsif p_source = 'auto' then
    select f.target_kind, f.target_id, f.reason into v_kind, v_target, v_reason from public.auto_flags f where f.id = p_report_id and f.status = 'open';
  else
    raise exception 'invalid_source';
  end if;
  if v_target is null then raise exception 'report_not_found'; end if;

  if p_action <> 'dismiss' then
    if v_kind = 'post' then
      select author_id into v_author from public.anonymous_posts where id = v_target;
      delete from public.anonymous_posts where id = v_target;
    elsif v_kind = 'comment' then
      select author_id into v_author from public.anonymous_post_comments where id = v_target;
      delete from public.anonymous_post_comments where id = v_target;
    elsif v_kind = 'message' then
      select sender_id into v_author from public.anonymous_inbox_messages where id = v_target;
      delete from public.anonymous_inbox_messages where id = v_target;
    elsif v_kind = 'room_post' then
      select author_id into v_author from public.posts where id = v_target;
      delete from public.posts where id = v_target;
    elsif v_kind = 'listing' then
      select seller_id into v_author from public.marketplace_listings where id = v_target;
      update public.marketplace_listings set status = 'removed', updated_at = timezone('utc', now()) where id = v_target;
    end if;
    v_result := jsonb_build_object('removed', true);

    if p_action = 'remove_strike' and v_author is not null then
      select * into v_strike from public.apply_strike(v_author, left('Report: ' || v_reason, 500), p_admin);
      v_result := v_result || jsonb_build_object('strike', v_strike.strike_number, 'kind', v_strike.kind, 'endsAt', v_strike.ends_at);
    end if;
  end if;

  update public.anonymous_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now()), resolved_by = p_admin
    where target_kind = v_kind and target_id = v_target and status = 'open';
  update public.post_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now()), resolved_by = p_admin
    where v_kind = 'room_post' and post_id = v_target and status = 'open';
  update public.marketplace_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end
    where v_kind = 'listing' and listing_id = v_target and status = 'pending';
  update public.auto_flags set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now())
    where target_kind = v_kind and target_id = v_target and status = 'open';

  return v_result || jsonb_build_object('action', p_action);
end;
$$;

revoke all on function public.flag_content(text, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.flag_content(text, uuid, text, text, jsonb) to service_role;
revoke all on function public.apply_media_verdict(text, text) from public, anon, authenticated;
grant execute on function public.apply_media_verdict(text, text) to service_role;
revoke all on function public.moderation_queue(integer) from public, anon, authenticated;
grant execute on function public.moderation_queue(integer) to service_role;
revoke all on function public.resolve_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_report(text, uuid, text, text) to service_role;
