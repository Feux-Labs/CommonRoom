-- Getting an Anonymous ID back on a new phone or browser.
-- An Anonymous ID is public (it is printed on every post and comment), so knowing it must never be enough to take it over.
-- Each ID gets a private recovery code, shown once when the ID is made. ID + code restores the ID: its posts, comments, inbox
-- and conversations move to the session that asks. Five wrong codes lock that ID for an hour.
alter table public.anonymous_identities
  add column if not exists recovery_hash text,
  add column if not exists restore_failures integer not null default 0,
  add column if not exists restore_locked_until timestamptz;

create or replace function public.make_recovery_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_out text := '';
  i integer;
begin
  for i in 0..11 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    if i in (3, 7) then v_out := v_out || '-'; end if;
  end loop;
  return v_out;
end;
$$;
revoke all on function public.make_recovery_code() from public, anon, authenticated;

-- Registering an ID now also returns its recovery code (only the first time, when the ID is created).
drop function if exists public.register_anonymous_identity(text);
create function public.register_anonymous_identity(p_handle text)
returns table (handle text, created_at timestamptz, recovery_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_handle text := btrim(p_handle);
  v_code text := public.make_recovery_code();
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if v_handle !~ '^[A-Za-z0-9_ ]{3,24}$' then raise exception 'invalid_anonymous_handle'; end if;

  perform public.consume_anonymous_rate_limit('identity', 8, 3600);

  insert into public.anonymous_identities (user_id, handle, recovery_hash)
  values (v_user_id, v_handle, extensions.crypt(replace(v_code, '-', ''), extensions.gen_salt('bf')))
  on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;

  return query
  select identity.handle, identity.created_at, case when v_inserted > 0 then v_code else null end
  from public.anonymous_identities identity
  where identity.user_id = v_user_id;
exception
  when unique_violation then raise exception 'anonymous_handle_taken';
end;
$$;
revoke execute on function public.register_anonymous_identity(text) from public, anon;
grant execute on function public.register_anonymous_identity(text) to authenticated;

-- A new recovery code for the ID you are using now (the old code stops working). Also how IDs made before this existed get one.
create or replace function public.issue_anonymous_recovery_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := public.make_recovery_code();
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  perform public.consume_anonymous_rate_limit('recovery', 5, 3600);
  update public.anonymous_identities
  set recovery_hash = extensions.crypt(replace(v_code, '-', ''), extensions.gen_salt('bf')), restore_failures = 0, restore_locked_until = null
  where user_id = v_user_id;
  if not found then raise exception 'anonymous_identity_required'; end if;
  return v_code;
end;
$$;
revoke execute on function public.issue_anonymous_recovery_code() from public, anon;
grant execute on function public.issue_anonymous_recovery_code() to authenticated;

-- true = this ID has a recovery code, false = it does not yet, null = you have no ID.
create or replace function public.anonymous_recovery_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (identity.recovery_hash is not null) from public.anonymous_identities identity where identity.user_id = auth.uid();
$$;
revoke execute on function public.anonymous_recovery_status() from public, anon;
grant execute on function public.anonymous_recovery_status() to authenticated;

-- Restore an ID: everything that belonged to it moves to the session asking. It returns a status instead of raising an error,
-- so a wrong code still counts toward the lockout (an error would undo the count).
create or replace function public.restore_anonymous_identity(p_handle text, p_code text, p_replace boolean default false)
returns table (status text, handle text, moved integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid := auth.uid();
  v_old uuid;
  v_hash text;
  v_locked timestamptz;
  v_handle text;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  r record;
  v_n integer;
  v_moved integer := 0;
begin
  if v_new is null then raise exception 'anonymous_auth_required'; end if;
  perform public.consume_anonymous_rate_limit('restore', 10, 3600);

  select i.user_id, i.recovery_hash, i.restore_locked_until, i.handle into v_old, v_hash, v_locked, v_handle
  from public.anonymous_identities i where lower(i.handle) = lower(btrim(coalesce(p_handle, ''))) limit 1;

  -- An unknown ID and a wrong code look the same, so nobody can use this to find out which IDs exist.
  if v_old is null or v_hash is null then return query select 'failed'::text, null::text, 0; return; end if;
  if v_locked is not null and v_locked > now() then return query select 'locked'::text, null::text, 0; return; end if;

  if extensions.crypt(v_code, v_hash) <> v_hash then
    update public.anonymous_identities set restore_failures = restore_failures + 1,
      restore_locked_until = case when restore_failures + 1 >= 5 then now() + interval '1 hour' else null end
    where user_id = v_old;
    return query select 'failed'::text, null::text, 0; return;
  end if;

  if v_old = v_new then return query select 'ok'::text, v_handle, 0; return; end if;
  -- IDs that belong to a signed-in account come back by signing in to that account, never by a code.
  if not coalesce((select u.is_anonymous from auth.users u where u.id = v_old), false)
     or exists (select 1 from public.admin_roles a where a.user_id = v_old) then
    return query select 'forbidden'::text, null::text, 0; return;
  end if;
  if exists (select 1 from public.anonymous_identities i where i.user_id = v_new) and not p_replace then
    return query select 'exists'::text, null::text, 0; return;
  end if;

  for r in
    select * from (values
      ('anonymous_identities', 'user_id'), ('anonymous_inbox_links', 'owner_id'), ('anonymous_inbox_threads', 'sender_id'),
      ('anonymous_inbox_messages', 'sender_id'), ('anonymous_media_uploads', 'owner_id'), ('anonymous_post_comments', 'author_id'),
      ('anonymous_post_likes', 'identity_id'), ('anonymous_post_owners', 'owner_id'), ('anonymous_posts', 'author_id'),
      ('anonymous_rate_limits', 'user_id'), ('anonymous_reports', 'reporter_id'), ('anonymous_blocks', 'blocker_id'),
      ('anonymous_blocks', 'blocked_id'), ('age_confirmations', 'user_id'), ('push_subscriptions', 'user_id'),
      ('notifications', 'user_id'), ('user_levels', 'user_id'), ('app_events', 'user_id'), ('content_reports', 'reporter_id')
    ) as t(tbl, col)
  loop
    begin
      execute format('update public.%I set %I = $1 where %I = $2', r.tbl, r.col, r.col) using v_new, v_old;
      get diagnostics v_n = row_count;
    exception when unique_violation then
      -- The new session already has its own row where only one is allowed: the restored one wins.
      execute format('delete from public.%I where %I = $1', r.tbl, r.col) using v_new;
      execute format('update public.%I set %I = $1 where %I = $2', r.tbl, r.col, r.col) using v_new, v_old;
      get diagnostics v_n = row_count;
    end;
    v_moved := v_moved + v_n;
  end loop;

  update public.anonymous_identities set restore_failures = 0, restore_locked_until = null where user_id = v_new;
  begin
    delete from auth.users where id = v_old;
  exception when others then null; -- the empty old session is only housekeeping
  end;
  return query select 'ok'::text, v_handle, v_moved;
end;
$$;
revoke execute on function public.restore_anonymous_identity(text, text, boolean) from public, anon;
grant execute on function public.restore_anonymous_identity(text, text, boolean) to authenticated;
