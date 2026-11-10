-- Moderator queue: one list of open reports from Anonymous, Room and Marketplace, and one action to resolve them.
-- Server only (service role / direct connection). Nothing here is callable from the public API.

alter table public.anonymous_reports
  add column if not exists status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text;

alter table public.post_reports
  add column if not exists status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text;

create index if not exists anonymous_reports_open_idx on public.anonymous_reports (created_at desc) where status = 'open';
create index if not exists post_reports_open_idx on public.post_reports (created_at desc) where status = 'open';
create index if not exists marketplace_reports_open_idx on public.marketplace_reports (created_at desc) where status = 'pending';

create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  report_id uuid,
  source text,
  target_kind text,
  target_id uuid,
  reason text,
  reported_at timestamptz,
  preview text,
  author_id uuid,
  report_count bigint,
  author_strikes bigint
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
  )
  select o.report_id, o.source, o.target_kind, o.target_id, o.reason, o.reported_at, o.preview, o.author_id,
    count(*) over (partition by o.target_kind, o.target_id) as report_count,
    (select count(*) from public.user_restrictions x where x.user_id = o.author_id) as author_strikes
  from open_reports o
  where o.preview is not null
  order by report_count desc, o.reported_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- action: 'dismiss' | 'remove' | 'remove_strike'. Resolves every open report about the same content.
create or replace function public.resolve_report(p_source text, p_report_id uuid, p_action text, p_admin text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_target uuid;
  v_reason text;
  v_author uuid;
  v_strike record;
  v_result jsonb := '{}'::jsonb;
begin
  if p_action not in ('dismiss', 'remove', 'remove_strike') then raise exception 'invalid_action'; end if;

  if p_source = 'anonymous' then
    select r.target_kind, r.target_id, r.reason into v_kind, v_target, v_reason from public.anonymous_reports r where r.id = p_report_id and r.status = 'open';
  elsif p_source = 'room' then
    select 'room_post', r.post_id, r.reason into v_kind, v_target, v_reason from public.post_reports r where r.id = p_report_id and r.status = 'open';
  elsif p_source = 'marketplace' then
    select 'listing', r.listing_id, r.reason into v_kind, v_target, v_reason from public.marketplace_reports r where r.id = p_report_id and r.status = 'pending';
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

  -- Close every open report about the same content (deleted content has its reports removed by cascade).
  update public.anonymous_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now()), resolved_by = p_admin
    where target_kind = v_kind and target_id = v_target and status = 'open';
  update public.post_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now()), resolved_by = p_admin
    where v_kind = 'room_post' and post_id = v_target and status = 'open';
  update public.marketplace_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end
    where v_kind = 'listing' and listing_id = v_target and status = 'pending';

  return v_result || jsonb_build_object('action', p_action);
end;
$$;

revoke all on function public.moderation_queue(integer) from public, anon, authenticated;
grant execute on function public.moderation_queue(integer) to service_role;
revoke all on function public.resolve_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_report(text, uuid, text, text) to service_role;
