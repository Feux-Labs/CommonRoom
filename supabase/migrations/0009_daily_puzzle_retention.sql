create table if not exists public.daily_puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_date date not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  grid text[] not null,
  words text[] not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  elapsed_seconds integer,
  hints_used integer not null default 0 check (hints_used between 0 and 6),
  score integer,
  found_words text[] not null default '{}',
  word_paths jsonb,
  check (array_length(grid, 1) = case difficulty when 'easy' then 8 when 'medium' then 10 else 12 end),
  check (array_length(words, 1) = case difficulty when 'easy' then 6 when 'medium' then 9 else 12 end),
  check (
    (completed_at is null and elapsed_seconds is null and score is null and word_paths is null)
    or
    (completed_at is not null and elapsed_seconds is not null and elapsed_seconds >= 0
      and score is not null and score >= 0 and word_paths is not null)
  )
);

create index if not exists daily_puzzle_attempts_user_date_idx
  on public.daily_puzzle_attempts (user_id, puzzle_date desc, difficulty, score desc);
create index if not exists daily_puzzle_attempts_date_score_idx
  on public.daily_puzzle_attempts (puzzle_date desc, score desc)
  where completed_at is not null;

create table if not exists public.daily_puzzle_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  leaderboard_visibility text not null default 'private'
    check (leaderboard_visibility in ('private', 'friends', 'school')),
  updated_at timestamptz not null default now()
);

alter table public.daily_puzzle_attempts enable row level security;
alter table public.daily_puzzle_preferences enable row level security;

drop policy if exists "Users read their own puzzle attempts" on public.daily_puzzle_attempts;
create policy "Users read their own puzzle attempts" on public.daily_puzzle_attempts
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users manage their own puzzle preferences" on public.daily_puzzle_preferences;
create policy "Users manage their own puzzle preferences" on public.daily_puzzle_preferences
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.daily_puzzle_attempts from authenticated;
grant select on public.daily_puzzle_attempts to authenticated;
grant select, insert, update, delete on public.daily_puzzle_preferences to authenticated;

create or replace function public.start_daily_puzzle_attempt(
  p_puzzle_date date,
  p_difficulty text,
  p_grid text[],
  p_words text[]
)
returns table (attempt_id uuid, started_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_size integer;
  v_word_count integer;
  v_attempt_id uuid;
  v_started_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Sign in to start a puzzle.' using errcode = '42501';
  end if;
  if p_puzzle_date <> (timezone('utc', now()))::date then
    raise exception 'Only today’s puzzle can be started.' using errcode = '22023';
  end if;

  v_size := case p_difficulty when 'easy' then 8 when 'medium' then 10 when 'hard' then 12 else null end;
  v_word_count := case p_difficulty when 'easy' then 6 when 'medium' then 9 when 'hard' then 12 else null end;
  if v_size is null
    or coalesce(array_ndims(p_grid), 0) <> 1
    or coalesce(array_ndims(p_words), 0) <> 1
    or coalesce(array_length(p_grid, 1), 0) <> v_size
    or coalesce(array_length(p_words, 1), 0) <> v_word_count
    or exists (select 1 from unnest(p_grid) as row_text where char_length(row_text) <> v_size)
    or exists (select 1 from unnest(p_words) as word where word !~ '^[A-Z]{3,20}$')
  then
    raise exception 'The puzzle configuration is invalid.' using errcode = '22023';
  end if;

  insert into public.daily_puzzle_attempts (user_id, puzzle_date, difficulty, grid, words)
  values (v_user_id, p_puzzle_date, p_difficulty, p_grid, p_words)
  returning id, daily_puzzle_attempts.started_at into v_attempt_id, v_started_at;

  return query select v_attempt_id, v_started_at;
end;
$$;

create or replace function public.use_daily_puzzle_hint(p_attempt_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hints integer;
begin
  update public.daily_puzzle_attempts
  set hints_used = hints_used + 1
  where id = p_attempt_id
    and user_id = auth.uid()
    and completed_at is null
    and hints_used < 6
  returning hints_used into v_hints;

  if v_hints is null then
    raise exception 'No hint is available for this attempt.' using errcode = '22023';
  end if;
  return v_hints;
end;
$$;

create or replace function public.finish_daily_puzzle_attempt(
  p_attempt_id uuid,
  p_word_paths jsonb
)
returns table (
  attempt_id uuid,
  score integer,
  elapsed_seconds integer,
  hints_used integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.daily_puzzle_attempts%rowtype;
  v_path jsonb;
  v_cell jsonb;
  v_word text;
  v_letters text;
  v_reverse text;
  v_row integer;
  v_column integer;
  v_first_row integer;
  v_first_column integer;
  v_delta_row integer;
  v_delta_column integer;
  v_index integer;
  v_size integer;
  v_elapsed integer;
  v_base_score integer;
  v_time_bonus integer;
  v_score integer;
  v_completed_at timestamptz := now();
  v_found text[] := '{}';
begin
  select * into v_attempt
  from public.daily_puzzle_attempts
  where id = p_attempt_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Puzzle attempt not found.' using errcode = 'P0002';
  end if;
  if v_attempt.completed_at is not null then
    return query select v_attempt.id, v_attempt.score, v_attempt.elapsed_seconds,
      v_attempt.hints_used, v_attempt.completed_at;
    return;
  end if;
  if jsonb_typeof(p_word_paths) <> 'array'
    or jsonb_array_length(p_word_paths) <> cardinality(v_attempt.words)
  then
    raise exception 'Find every word before submitting your result.' using errcode = '22023';
  end if;

  v_size := cardinality(v_attempt.grid);
  for v_path in select value from jsonb_array_elements(p_word_paths)
  loop
    v_word := v_path ->> 'word';
    if v_word is null or v_word = any(v_found) or not (v_word = any(v_attempt.words))
      or jsonb_typeof(v_path -> 'cells') <> 'array'
      or jsonb_array_length(v_path -> 'cells') <> char_length(v_word)
    then
      raise exception 'A submitted word path is invalid.' using errcode = '22023';
    end if;

    v_letters := '';
    v_reverse := '';
    v_first_row := null;
    v_first_column := null;
    v_delta_row := null;
    v_delta_column := null;
    v_index := 0;

    for v_cell in select value from jsonb_array_elements(v_path -> 'cells')
    loop
      v_row := (v_cell ->> 'row')::integer;
      v_column := (v_cell ->> 'column')::integer;
      if v_row < 0 or v_row >= v_size or v_column < 0 or v_column >= v_size then
        raise exception 'A submitted word path is outside the board.' using errcode = '22023';
      end if;
      if v_index = 0 then
        v_first_row := v_row;
        v_first_column := v_column;
      elsif v_index = 1 then
        v_delta_row := v_row - v_first_row;
        v_delta_column := v_column - v_first_column;
        if abs(v_delta_row) > 1 or abs(v_delta_column) > 1
          or (v_delta_row = 0 and v_delta_column = 0)
          or (v_attempt.difficulty = 'easy' and v_delta_row <> 0 and v_delta_column <> 0)
          or (v_attempt.difficulty = 'medium' and abs(v_delta_row) = 1 and abs(v_delta_column) = 1)
        then
          raise exception 'The word path uses a direction not allowed for this difficulty.' using errcode = '22023';
        end if;
      elsif v_row <> v_first_row + v_delta_row * v_index
        or v_column <> v_first_column + v_delta_column * v_index
      then
        raise exception 'The word path must continue in one direction.' using errcode = '22023';
      end if;

      v_letters := v_letters || substring(v_attempt.grid[v_row + 1] from v_column + 1 for 1);
      v_index := v_index + 1;
    end loop;

    select string_agg(substr(v_letters, pos, 1), '' order by pos desc)
      into v_reverse from generate_series(1, char_length(v_letters)) as positions(pos);
    if v_letters <> v_word and v_reverse <> v_word then
      raise exception 'A selected path does not spell its word.' using errcode = '22023';
    end if;
    v_found := array_append(v_found, v_word);
  end loop;

  if exists (select 1 from unnest(v_attempt.words) as required_word where not (required_word = any(v_found))) then
    raise exception 'Find every word before submitting your result.' using errcode = '22023';
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (v_completed_at - v_attempt.started_at)))::integer);
  v_base_score := case v_attempt.difficulty when 'easy' then 100 when 'medium' then 250 else 500 end;
  v_time_bonus := greatest(0, 300 - floor(v_elapsed / 10.0)::integer * 5);
  v_score := greatest(0, v_base_score + v_time_bonus - v_attempt.hints_used * 50);

  update public.daily_puzzle_attempts
  set completed_at = v_completed_at,
      elapsed_seconds = v_elapsed,
      score = v_score,
      found_words = v_found,
      word_paths = p_word_paths
  where id = p_attempt_id
  returning public.daily_puzzle_attempts.id, public.daily_puzzle_attempts.score,
    public.daily_puzzle_attempts.elapsed_seconds, public.daily_puzzle_attempts.hints_used,
    public.daily_puzzle_attempts.completed_at
  into attempt_id, score, elapsed_seconds, hints_used, completed_at;

  return next;
end;
$$;

create or replace function public.set_daily_puzzle_leaderboard_visibility(p_visibility text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to update leaderboard privacy.' using errcode = '42501';
  end if;
  if p_visibility not in ('private', 'friends', 'school') then
    raise exception 'Choose a valid leaderboard privacy setting.' using errcode = '22023';
  end if;
  insert into public.daily_puzzle_preferences (user_id, leaderboard_visibility, updated_at)
  values (auth.uid(), p_visibility, now())
  on conflict (user_id) do update
  set leaderboard_visibility = excluded.leaderboard_visibility,
      updated_at = excluded.updated_at;
  return p_visibility;
end;
$$;

create or replace function public.get_daily_puzzle_leaderboard(p_period text, p_scope text)
returns table (
  rank bigint,
  display_name text,
  score bigint,
  completed_days bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with caller as (
    select auth.uid() as id, p.school
    from (select auth.uid() as id) user_id
    left join public.profiles p on p.id = user_id.id
  ),
  eligible_attempts as (
    select a.user_id, a.puzzle_date, max(a.score)::bigint as daily_score
    from public.daily_puzzle_attempts a
    join public.daily_puzzle_preferences preference on preference.user_id = a.user_id
    join public.profiles profile on profile.id = a.user_id
    cross join caller
    where a.completed_at is not null
      and (
        (p_period = 'daily' and a.puzzle_date = (timezone('utc', now()))::date)
        or
        (p_period = 'weekly' and a.puzzle_date >= (timezone('utc', now()))::date - 6
          and a.puzzle_date <= (timezone('utc', now()))::date)
      )
      and (
        a.user_id = caller.id
        or (
          p_scope = 'friends'
          and preference.leaderboard_visibility in ('friends', 'school')
          and exists (
            select 1 from public.follows f1
            join public.follows f2
              on f1.follower_id = f2.following_id and f1.following_id = f2.follower_id
            where f1.follower_id = caller.id and f1.following_id = a.user_id
          )
        )
        or (
          p_scope = 'school'
          and preference.leaderboard_visibility = 'school'
          and caller.school is not null
          and profile.school = caller.school
        )
      )
    group by a.user_id, a.puzzle_date
  ),
  totals as (
    select user_id, sum(daily_score)::bigint as total_score, count(*)::bigint as played_days
    from eligible_attempts
    group by user_id
  ),
  ranked as (
    select totals.user_id, totals.total_score, totals.played_days,
      row_number() over (order by totals.total_score desc, totals.played_days desc, totals.user_id) as place
    from totals
  )
  select ranked.place,
    coalesce(nullif(profile.display_name, ''), 'Student'),
    ranked.total_score,
    ranked.played_days
  from ranked
  join public.profiles profile on profile.id = ranked.user_id
  order by ranked.place
  limit 50;
$$;

revoke all on function public.start_daily_puzzle_attempt(date, text, text[], text[]) from public, anon;
revoke all on function public.use_daily_puzzle_hint(uuid) from public, anon;
revoke all on function public.finish_daily_puzzle_attempt(uuid, jsonb) from public, anon;
revoke all on function public.set_daily_puzzle_leaderboard_visibility(text) from public, anon;
revoke all on function public.get_daily_puzzle_leaderboard(text, text) from public, anon;

grant execute on function public.start_daily_puzzle_attempt(date, text, text[], text[]) to authenticated;
grant execute on function public.use_daily_puzzle_hint(uuid) to authenticated;
grant execute on function public.finish_daily_puzzle_attempt(uuid, jsonb) to authenticated;
grant execute on function public.set_daily_puzzle_leaderboard_visibility(text) to authenticated;
grant execute on function public.get_daily_puzzle_leaderboard(text, text) to authenticated;
