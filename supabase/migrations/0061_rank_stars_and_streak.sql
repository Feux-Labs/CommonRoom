-- New ladder (Lapo Baby, Nepo Baby, Legendary, Awakening, The Divine), five small stars per rank instead of three steps,
-- Pro doubling until the end of Doctore, guests can have ranks, and the streak is returned for the streak creature and the friendly warnings.
drop function if exists public.my_level();
create or replace function public.my_level()
returns table (points bigint, level integer, level_name text, phase text, step integer, floor_points integer, next_at integer, pro boolean, pro_until timestamptz, ultimate_pass boolean, ladder jsonb, earned_points bigint, boost_price_kobo integer, boost_available_at timestamptz, streak integer, streak_gap integer, prior_streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_posts bigint; v_comments bigint; v_likes bigint; v_cr bigint; v_invites bigint; v_reports bigint;
  v_streak integer := 0; v_day date; v_today date := (now() at time zone 'Africa/Lagos')::date; v_last date; v_gap integer := 0; v_prior integer := 0; v_run integer := 0;
  v_raw bigint; v_eff bigint; v_pass boolean; v_pro boolean;
  v_earned bigint; v_bonus bigint; v_boosted_at timestamptz; v_strikes bigint; v_points bigint;
  r record; v_ladder jsonb; v_rank_start integer; v_rank_end integer; v_step integer; v_next integer;
begin
  -- Guests (anonymous sessions) have ranks too: they earn from Anonymous posts, comments and daily visits.
  if v_uid is null then raise exception 'account_required'; end if;

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

  -- Daily streak (Nigeria time): consecutive days with an app open. v_last is the most recent open day, v_gap is how many days ago.
  select max((e.created_at at time zone 'Africa/Lagos')::date) into v_last from public.app_events e where e.user_id = v_uid and e.event = 'app_open' and e.created_at > now() - interval '400 days';
  if v_last is not null then
    v_gap := v_today - v_last;
    v_day := v_last;
    while v_run < 365 and exists (select 1 from public.app_events e where e.user_id = v_uid and e.event = 'app_open' and e.created_at > now() - interval '400 days' and (e.created_at at time zone 'Africa/Lagos')::date = v_day) loop
      v_run := v_run + 1;
      v_day := v_day - 1;
    end loop;
    v_prior := v_run;
    if v_gap <= 1 then v_streak := v_run; end if;
  end if;

  select coalesce(sum(use_count), 0) into v_invites from public.invites where inviter_id = v_uid;
  select (select count(*) from public.post_reports where reporter_id = v_uid and status = 'actioned')
       + (select count(*) from public.anonymous_reports where reporter_id = v_uid and status = 'actioned')
       + (select count(*) from public.content_reports where reporter_id = v_uid and status = 'actioned') into v_reports;

  v_raw := 5 * v_posts + 2 * v_comments + v_likes + 2 * v_cr + 2 * least(v_streak, 30) + 20 * least(v_invites, 25) + 5 * least(v_reports, 20);

  v_pro := public.is_pro(v_uid);
  v_pass := coalesce((select e.ultimate_pass from public.user_entitlements e where e.user_id = v_uid), false);
  v_eff := case when v_pro then (case when v_raw <= 4000 then v_raw * 2 else 4000 * 2 + (v_raw - 4000) end) else v_raw end;
  if v_pass then v_eff := greatest(v_eff, 700); end if;

  insert into public.user_levels (user_id, peak_points) values (v_uid, v_eff)
  on conflict (user_id) do update set peak_points = greatest(public.user_levels.peak_points, excluded.peak_points), updated_at = now()
  returning peak_points, boost_bonus, boosted_at into v_earned, v_bonus, v_boosted_at;

  select count(*) into v_strikes from public.user_restrictions x where x.user_id = v_uid;
  v_points := greatest(0, v_earned + v_bonus - 50 * v_strikes);

  create temporary table if not exists _ranks (idx integer, rname text, rphase text, start_pts integer) on commit drop;
  truncate _ranks;
  insert into _ranks values
    (1, 'Novice', 'Lapo Baby', 0), (2, 'Amateur', 'Lapo Baby', 40), (3, 'Regular', 'Lapo Baby', 150), (4, 'Professional', 'Lapo Baby', 700),
    (5, 'Young Master', 'Nepo Baby', 1300), (6, 'High Chief', 'Nepo Baby', 2100), (7, 'Senator', 'Nepo Baby', 3600),
    (8, 'Sensei', 'Legendary', 4300), (9, 'Shifu', 'Legendary', 4900), (10, 'Doctore', 'Legendary', 5400), (11, 'Paragon', 'Legendary', 8000),
    (12, 'Awakening', 'Awakening', 11000), (13, 'Sage', 'Awakening', 14400), (14, 'Great Sage', 'Awakening', 17500), (15, 'Deity', 'Awakening', 21900),
    (16, 'Immortal', 'The Divine', 26000), (17, 'God', 'The Divine', 32900), (18, 'True God', 'The Divine', 37500), (19, 'Ancient God', 'The Divine', 41000), (20, 'Universe', 'The Divine', 43800);

  select * into r from _ranks where start_pts <= v_points order by idx desc limit 1;
  v_rank_start := r.start_pts;
  v_rank_end := coalesce((select start_pts from _ranks where idx = r.idx + 1), r.start_pts + 9000);
  v_step := least(5, 1 + floor((v_points - v_rank_start)::numeric / ((v_rank_end - v_rank_start)::numeric / 5))::integer);
  v_next := case when r.idx = 20 and v_step = 5 then null else (v_rank_start + ((v_rank_end - v_rank_start) * v_step) / 5)::integer end;
  select jsonb_agg(jsonb_build_object('name', rname, 'phase', rphase, 'start', start_pts) order by idx) into v_ladder from _ranks;

  return query select v_points, r.idx, r.rname, r.rphase, v_step,
    (v_rank_start + ((v_rank_end - v_rank_start) * (v_step - 1)) / 5)::integer, v_next,
    v_pro, (select e.pro_until from public.user_entitlements e where e.user_id = v_uid), v_pass, v_ladder,
    v_earned,
    case when v_next is null then null else 10000 + r.idx * 5000 end,
    case when v_boosted_at is not null and v_boosted_at > now() - interval '24 hours' then v_boosted_at + interval '24 hours' else null end,
    v_streak, v_gap, v_prior;
end;
$$;
revoke all on function public.my_level() from public, anon;
grant execute on function public.my_level() to authenticated;
