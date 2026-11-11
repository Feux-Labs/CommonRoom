-- Levels, the way the product plan (D16) defines them: five phases with ranks inside, three steps per rank (20 ranks, 60 steps).
--   Rookie: Novice, Amateur, Regular
--   Ultimate: Chief, Prodigy, Senator, Sensei, Shifu, Doctore
--   Legend: Hero, Champion, Paragon, Legend
--   Immortal: Awakening, Immortal
--   Sages and Gods: Sage, Great Sage, God, True God, Ancient God
-- Point thresholds are first estimates from the pace targets (a daily power user reaches Doctore in about 3 months, a casual
-- user in about 10); they are dials to tune from real usage. Rank never goes down: we keep each person's highest total.
-- Pro doubles points up to the end of Doctore. The Ultimate Pass starts you at Chief.
create table if not exists public.user_levels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  peak_points bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_levels enable row level security;
revoke all on public.user_levels from anon, authenticated;

drop function if exists public.my_level();
create or replace function public.my_level()
returns table (points bigint, level integer, level_name text, phase text, step integer, floor_points integer, next_at integer, pro boolean, pro_until timestamptz, ultimate_pass boolean, ladder jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_raw bigint;
  v_eff bigint;
  v_pass boolean;
  v_pro boolean;
  v_peak bigint;
  r record;
  v_ladder jsonb;
  v_rank_start integer;
  v_rank_end integer;
  v_step integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then raise exception 'account_required'; end if;

  v_raw :=
      5 * (select count(*) from public.posts p where p.author_id = v_uid)
    + 5 * (select count(*) from public.anonymous_posts p where p.author_id = v_uid)
    + 2 * (select count(*) from public.post_comments c where c.author_id = v_uid)
    + 2 * (select count(*) from public.anonymous_post_comments c where c.author_id = v_uid)
    + 1 * (select count(*) from public.post_likes l join public.posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid)
    + 1 * (select count(*) from public.anonymous_post_likes l join public.anonymous_posts p on p.id = l.post_id where p.author_id = v_uid and l.user_id <> v_uid)
    + 2 * (select count(*) from public.post_comments c join public.posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid)
    + 2 * (select count(*) from public.anonymous_post_comments c join public.anonymous_posts p on p.id = c.post_id where p.author_id = v_uid and c.author_id <> v_uid);

  v_pro := public.is_pro(v_uid);
  v_pass := coalesce((select e.ultimate_pass from public.user_entitlements e where e.user_id = v_uid), false);
  -- Pro: points count double until the end of Doctore (5,400), single after that.
  v_eff := case when v_pro then (case when v_raw <= 2700 then v_raw * 2 else 2700 * 2 + (v_raw - 2700) end) else v_raw end;
  if v_pass then v_eff := greatest(v_eff, 700); end if;

  insert into public.user_levels (user_id, peak_points) values (v_uid, v_eff)
  on conflict (user_id) do update set peak_points = greatest(public.user_levels.peak_points, excluded.peak_points), updated_at = now()
  returning peak_points into v_peak;

  create temporary table if not exists _ranks (idx integer, rname text, rphase text, start_pts integer) on commit drop;
  truncate _ranks;
  insert into _ranks values
    (1, 'Novice', 'Rookie', 0), (2, 'Amateur', 'Rookie', 40), (3, 'Regular', 'Rookie', 150),
    (4, 'Chief', 'Ultimate', 700), (5, 'Prodigy', 'Ultimate', 1300), (6, 'Senator', 'Ultimate', 2100), (7, 'Sensei', 'Ultimate', 3600), (8, 'Shifu', 'Ultimate', 4300), (9, 'Doctore', 'Ultimate', 4900),
    (10, 'Hero', 'Legend', 5400), (11, 'Champion', 'Legend', 8000), (12, 'Paragon', 'Legend', 11000), (13, 'Legend', 'Legend', 14400),
    (14, 'Awakening', 'Immortal', 17500), (15, 'Immortal', 'Immortal', 21900),
    (16, 'Sage', 'Sages and Gods', 26000), (17, 'Great Sage', 'Sages and Gods', 32900), (18, 'God', 'Sages and Gods', 37500), (19, 'True God', 'Sages and Gods', 41000), (20, 'Ancient God', 'Sages and Gods', 43800);

  select * into r from _ranks where start_pts <= v_peak order by idx desc limit 1;
  v_rank_start := r.start_pts;
  v_rank_end := coalesce((select start_pts from _ranks where idx = r.idx + 1), r.start_pts + 9000);
  v_step := least(3, 1 + floor((v_peak - v_rank_start)::numeric / ((v_rank_end - v_rank_start)::numeric / 3))::integer);

  select jsonb_agg(jsonb_build_object('name', rname, 'phase', rphase, 'start', start_pts) order by idx) into v_ladder from _ranks;

  return query select v_peak, r.idx, r.rname, r.rphase, v_step,
    (v_rank_start + ((v_rank_end - v_rank_start) * (v_step - 1)) / 3)::integer,
    case when r.idx = 20 and v_step = 3 then null else (v_rank_start + ((v_rank_end - v_rank_start) * v_step) / 3)::integer end,
    v_pro, (select e.pro_until from public.user_entitlements e where e.user_id = v_uid), v_pass, v_ladder;
end;
$$;
revoke all on function public.my_level() from public, anon;
grant execute on function public.my_level() to authenticated;
