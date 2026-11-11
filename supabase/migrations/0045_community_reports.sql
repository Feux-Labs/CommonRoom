-- Communities can be reported like anything else user-made. A report shows up in the admin queue; removing it deletes the
-- group (its posts stay in Room as ordinary posts) and can give the owner a strike.
alter table public.content_reports drop constraint if exists content_reports_target_kind_check;
alter table public.content_reports add constraint content_reports_target_kind_check check (target_kind in ('market_message', 'profile', 'community'));

create or replace function public.report_community(p_community_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_user is null or not exists (select 1 from public.profiles p where p.id = v_user) then raise exception 'account_required'; end if;
  if char_length(v_reason) not between 3 and 500 then raise exception 'invalid_reason'; end if;
  if not exists (select 1 from public.communities c where c.id = p_community_id) then raise exception 'community_not_found'; end if;
  if exists (select 1 from public.communities c where c.id = p_community_id and c.created_by = v_user) then raise exception 'own_community'; end if;
  perform public.consume_anonymous_rate_limit('content_report', 20, 3600);
  insert into public.content_reports (reporter_id, target_kind, target_id, reason) values (v_user, 'community', p_community_id, v_reason)
  on conflict (reporter_id, target_kind, target_id) do nothing;
end;
$$;
revoke all on function public.report_community(uuid, text) from public, anon;
grant execute on function public.report_community(uuid, text) to authenticated;

CREATE OR REPLACE FUNCTION public.moderation_queue(p_limit integer DEFAULT 50)
 RETURNS TABLE(report_id uuid, source text, target_kind text, target_id uuid, reason text, reported_at timestamp with time zone, preview text, author_id uuid, report_count bigint, author_strikes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        when 'comment' then (select left(c.body, 300) from public.anonymous_post_comments c where c.id = f.target_id)
        when 'room_comment' then (select left(c.body, 300) from public.post_comments c where c.id = f.target_id)
        when 'market_message' then (select left(m.body, 300) from public.market_messages m where m.id = f.target_id)
      end,
      case f.target_kind
        when 'post' then (select p.author_id from public.anonymous_posts p where p.id = f.target_id)
        when 'room_post' then (select p.author_id from public.posts p where p.id = f.target_id)
        when 'listing' then (select l.seller_id from public.marketplace_listings l where l.id = f.target_id)
        when 'comment' then (select c.author_id from public.anonymous_post_comments c where c.id = f.target_id)
        when 'room_comment' then (select c.author_id from public.post_comments c where c.id = f.target_id)
        when 'market_message' then (select m.sender_id from public.market_messages m where m.id = f.target_id)
      end
    from public.auto_flags f where f.status = 'open'
    union all
    select c.id, 'content', c.target_kind, c.target_id, c.reason, c.created_at,
      case c.target_kind
        when 'market_message' then (select left(m.body, 300) from public.market_messages m where m.id = c.target_id)
        when 'profile' then (select left(coalesce(p.display_name, '') || ' (@' || coalesce(p.username, '') || ') ' || coalesce(p.bio, ''), 300) from public.profiles p where p.id = c.target_id)
        when 'community' then (select left(g.name || ': ' || g.description, 300) from public.communities g where g.id = c.target_id)
      end,
      case c.target_kind
        when 'market_message' then (select m.sender_id from public.market_messages m where m.id = c.target_id)
        when 'profile' then c.target_id
        when 'community' then (select g.created_by from public.communities g where g.id = c.target_id)
      end
    from public.content_reports c where c.status = 'open'
  )
  select o.report_id, o.source, o.target_kind, o.target_id, o.reason, o.reported_at, o.preview, o.author_id,
    count(*) over (partition by o.target_kind, o.target_id) as report_count,
    (select count(*) from public.user_restrictions x where x.user_id = o.author_id) as author_strikes
  from open_reports o
  where o.preview is not null
  order by report_count desc, o.reported_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$function$;

CREATE OR REPLACE FUNCTION public.resolve_report(p_source text, p_report_id uuid, p_action text, p_admin text DEFAULT 'admin'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  elsif p_source = 'content' then
    select c.target_kind, c.target_id, c.reason into v_kind, v_target, v_reason from public.content_reports c where c.id = p_report_id and c.status = 'open';
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
    elsif v_kind = 'room_comment' then
      select author_id into v_author from public.post_comments where id = v_target;
      delete from public.post_comments where id = v_target;
    elsif v_kind = 'market_message' then
      select sender_id into v_author from public.market_messages where id = v_target;
      delete from public.market_messages where id = v_target;
    elsif v_kind = 'profile' then
      -- A profile cannot be deleted by a report: remove means clearing the parts people see (bio and photo).
      v_author := v_target;
      update public.profiles set bio = '', avatar_url = null, updated_at = timezone('utc', now()) where id = v_target;
    elsif v_kind = 'community' then
      -- Removing a reported community deletes the group; its posts stay in Room as ordinary posts.
      select created_by into v_author from public.communities where id = v_target;
      delete from public.communities where id = v_target;
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
  update public.content_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now())
    where target_kind = v_kind and target_id = v_target and status = 'open';
  update public.auto_flags set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_at = timezone('utc', now())
    where target_kind = v_kind and target_id = v_target and status = 'open';

  return v_result || jsonb_build_object('action', p_action);
end;
$function$;
