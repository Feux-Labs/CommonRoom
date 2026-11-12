-- Rank rules, the way the plan describes them, plus the pay-to-climb boost.
--   * Posts: 5 points each, at most 5 posts a day count. Comments you write: 2 each, at most 20 a day.
--   * Likes and comments you receive: full value for the first 10 on a post, then diminishing (square root).
--   * Daily streak: 2 points per day of your current streak, up to 30 days.
--   * Invites that became real sign-ups: 20 each, up to 25. Reports a moderator confirmed: 5 each, up to 20.
--   * A strike (confirmed violation) removes 50 points.
--   * Pay to climb: one step, at most once every 24 hours, price grows with rank. Boost points never count as "earned".
-- Rank rises with your best earned total and only falls from strikes.
alter table public.user_levels add column if not exists boost_bonus bigint not null default 0;
alter table public.user_levels add column if not exists boosted_at timestamptz;
alter table public.user_levels add column if not exists boosted_steps integer not null default 0;

drop function if exists public.my_level();
create or replace function public.my_level()
returns table (points bigint, level integer, level_name text, phase text, step integer, floor_points integer, next_at integer, pro boolean, pro_until timestamptz, ultimate_pass boolean, ladder jsonb, earned_points bigint, boost_price_kobo integer, boost_available_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_posts bigint; v_comments bigint; v_likes bigint; v_cr bigint; v_invites bigint; v_reports bigint;
  v_streak integer := 0; v_day date; v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_raw bigint; v_eff bigint; v_pass boolean; v_pro boolean;
  v_earned bigint; v_bonus bigint; v_boosted_at timestamptz; v_strikes bigint; v_points bigint;
  r record; v_ladder jsonb; v_rank_start integer; v_rank_end integer; v_step integer; v_next integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;

  select coalesce(sum(least(n, 5)), 0) into v_posts from (
    select d, count(*) n from (
      select (created_at at time zone 'Africa/Lagos')::date d from public.posts where author_id = v_uid
      union all select (created_at at time zone 'Africa/Lagos')::date from public.anonymous_posts where author_id = v_uid) x group by d) y;
  select coalesce(sum(least(n, 20)), 0) into v_comments from (
    select d, count(*) n from (
      select (created_at at time zone 'Africa/Lagos')::date d from public.post_comments where author_id = v_uid
      union all select (created_at at time zone 'Africa/Lagos')::date from public.anonymous_post_comments where author_id = v_uid) x group by d) y;
  select coalesce(sum(least(n, 10) + floor(sqrt(greatest(n - 10, 0)))), 0) into v_likes from (
    select count(*) n from public.post_likes l join public.posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid group by p.id
    union all select count(*) from public.anonymous_post_likes l join public.anonymous_posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid group by p.id) z;
  select coalesce(sum(least(n, 10) + floor(sqrt(greatest(n - 10, 0)))), 0) into v_cr from (
    select count(*) n from public.post_comments c join public.posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid group by p.id
    union all select count(*) from public.anonymous_post_comments c join public.anonymous_posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid group by p.id) z;

  -- Current streak: consecutive days (Nigeria time) with an app open, counting back from today, or from yesterday if you have not opened it yet today.
  v_day := v_today;
  if not exists (select 1 from public.app_events e where e.user_id = v_uid and e.event = 'app_open' and (e.created_at at time zone 'Africa/Lagos')::date = v_today) then v_day := v_today - 1; end if;
  while v_streak < 30 and exists (select 1 from public.app_events e where e.user_id = v_uid and e.event = 'app_open' and e.created_at > now() - interval '40 days' and (e.created_at at time zone 'Africa/Lagos')::date = v_day) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  select coalesce(sum(use_count), 0) into v_invites from public.invites where inviter_id = v_uid;
  select (select count(*) from public.post_reports where reporter_id = v_uid and status = 'actioned')
       + (select count(*) from public.anonymous_reports where reporter_id = v_uid and status = 'actioned')
       + (select count(*) from public.content_reports where reporter_id = v_uid and status = 'actioned') into v_reports;

  v_raw := 5 * v_posts + 2 * v_comments + v_likes + 2 * v_cr + 2 * least(v_streak, 30) + 20 * least(v_invites, 25) + 5 * least(v_reports, 20);

  v_pro := public.is_pro(v_uid);
  v_pass := coalesce((select e.ultimate_pass from public.user_entitlements e where e.user_id = v_uid), false);
  v_eff := case when v_pro then (case when v_raw <= 2700 then v_raw * 2 else 2700 * 2 + (v_raw - 2700) end) else v_raw end;
  if v_pass then v_eff := greatest(v_eff, 700); end if;

  insert into public.user_levels (user_id, peak_points) values (v_uid, v_eff)
  on conflict (user_id) do update set peak_points = greatest(public.user_levels.peak_points, excluded.peak_points), updated_at = now()
  returning peak_points, boost_bonus, boosted_at into v_earned, v_bonus, v_boosted_at;

  select count(*) into v_strikes from public.user_restrictions x where x.user_id = v_uid;
  v_points := greatest(0, v_earned + v_bonus - 50 * v_strikes);

  create temporary table if not exists _ranks (idx integer, rname text, rphase text, start_pts integer) on commit drop;
  truncate _ranks;
  insert into _ranks values
    (1, 'Novice', 'Rookie', 0), (2, 'Amateur', 'Rookie', 40), (3, 'Regular', 'Rookie', 150),
    (4, 'Chief', 'Ultimate', 700), (5, 'Prodigy', 'Ultimate', 1300), (6, 'Senator', 'Ultimate', 2100), (7, 'Sensei', 'Ultimate', 3600), (8, 'Shifu', 'Ultimate', 4300), (9, 'Doctore', 'Ultimate', 4900),
    (10, 'Hero', 'Legend', 5400), (11, 'Champion', 'Legend', 8000), (12, 'Paragon', 'Legend', 11000), (13, 'Legend', 'Legend', 14400),
    (14, 'Awakening', 'Immortal', 17500), (15, 'Immortal', 'Immortal', 21900),
    (16, 'Sage', 'Sages and Gods', 26000), (17, 'Great Sage', 'Sages and Gods', 32900), (18, 'God', 'Sages and Gods', 37500), (19, 'True God', 'Sages and Gods', 41000), (20, 'Ancient God', 'Sages and Gods', 43800);

  select * into r from _ranks where start_pts <= v_points order by idx desc limit 1;
  v_rank_start := r.start_pts;
  v_rank_end := coalesce((select start_pts from _ranks where idx = r.idx + 1), r.start_pts + 9000);
  v_step := least(3, 1 + floor((v_points - v_rank_start)::numeric / ((v_rank_end - v_rank_start)::numeric / 3))::integer);
  v_next := case when r.idx = 20 and v_step = 3 then null else (v_rank_start + ((v_rank_end - v_rank_start) * v_step) / 3)::integer end;
  select jsonb_agg(jsonb_build_object('name', rname, 'phase', rphase, 'start', start_pts) order by idx) into v_ladder from _ranks;

  return query select v_points, r.idx, r.rname, r.rphase, v_step,
    (v_rank_start + ((v_rank_end - v_rank_start) * (v_step - 1)) / 3)::integer, v_next,
    v_pro, (select e.pro_until from public.user_entitlements e where e.user_id = v_uid), v_pass, v_ladder,
    v_earned,
    case when v_next is null then null else 10000 + r.idx * 5000 end,
    case when v_boosted_at is not null and v_boosted_at > now() - interval '24 hours' then v_boosted_at + interval '24 hours' else null end;
end;
$$;
revoke all on function public.my_level() from public, anon;
grant execute on function public.my_level() to authenticated;

CREATE OR REPLACE FUNCTION public.apply_payment_success(p_reference text, p_provider_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment public.payments%rowtype;
  v_first_pro boolean := false;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if v_payment.status = 'success' then return 'already'; end if;

  update public.payments set status = 'success', provider_id = p_provider_id, paid_at = timezone('utc', now())
  where id = v_payment.id;

  if v_payment.product = 'pro_month' then
    -- The first Pro subscription includes 2 free days of advertising.
    v_first_pro := not exists (select 1 from public.payments x where x.user_id = v_payment.user_id and x.product = 'pro_month' and x.status = 'success' and x.id <> v_payment.id);
    insert into public.user_entitlements (user_id, pro_until)
    values (v_payment.user_id, timezone('utc', now()) + interval '30 days')
    on conflict (user_id) do update
    set pro_until = greatest(coalesce(public.user_entitlements.pro_until, timezone('utc', now())), timezone('utc', now())) + interval '30 days',
        updated_at = timezone('utc', now());
    if v_first_pro then
      update public.user_entitlements set free_ad_days = free_ad_days + 2 where user_id = v_payment.user_id;
    end if;
  elsif v_payment.product = 'ad_campaign' then
    -- A paid advertising campaign goes live the moment the payment is confirmed.
    update public.ads set status = 'active', starts_at = timezone('utc', now()), ends_at = timezone('utc', now()) + make_interval(days => ads.days)
    where id = v_payment.product_ref::uuid and owner_id = v_payment.user_id and status = 'pending_payment';
  elsif v_payment.product = 'rank_boost' then
    -- Climb one step: product_ref is "points-now:points-at-the-next-step". The difference is added as a bonus.
    insert into public.user_levels (user_id, boost_bonus, boosted_at, boosted_steps)
    values (v_payment.user_id, greatest(1, split_part(v_payment.product_ref, ':', 2)::bigint - split_part(v_payment.product_ref, ':', 1)::bigint), timezone('utc', now()), 1)
    on conflict (user_id) do update set
      boost_bonus = public.user_levels.boost_bonus + greatest(1, split_part(v_payment.product_ref, ':', 2)::bigint - split_part(v_payment.product_ref, ':', 1)::bigint),
      boosted_at = timezone('utc', now()), boosted_steps = public.user_levels.boosted_steps + 1, updated_at = timezone('utc', now());
  elsif v_payment.product = 'ultimate_pass' then
    insert into public.user_entitlements (user_id, ultimate_pass)
    values (v_payment.user_id, true)
    on conflict (user_id) do update set ultimate_pass = true, updated_at = timezone('utc', now());
  end if;

  begin
    insert into public.notifications (user_id, kind, title, link)
    values (v_payment.user_id, 'system', 'Payment received. Thank you!', '/me');
  exception when others then null;
  end;
  return 'applied';
end;
$function$;
