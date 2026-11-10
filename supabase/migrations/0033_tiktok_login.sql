-- Sign in with TikTok. Supabase has no TikTok provider, so our server finishes the TikTok login and then signs the
-- person in to a normal account that belongs to their TikTok id. TikTok gives no email, so the account gets an
-- internal address that cannot receive mail, and its password is replaced with a fresh random one at every login
-- (nobody ever knows it: the only way in is through TikTok).
create table if not exists public.tiktok_identities (
  open_id text primary key check (open_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.tiktok_identities enable row level security;
revoke all on public.tiktok_identities from anon, authenticated;

-- Finds or creates the account for a TikTok id, sets a one-time password, and returns the account's internal email.
create or replace function public.tiktok_login(p_open_id text, p_display_name text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_email text;
begin
  if p_open_id !~ '^[A-Za-z0-9_-]{8,128}$' then raise exception 'invalid_open_id'; end if;
  if char_length(coalesce(p_password, '')) < 32 then raise exception 'weak_password'; end if;

  select user_id into v_user from public.tiktok_identities where open_id = p_open_id;
  if v_user is null then
    v_email := 'tiktok-' || substr(encode(extensions.digest(p_open_id, 'sha256'), 'hex'), 1, 24) || '@tiktok.login.invalid';
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', v_email,
            extensions.crypt(p_password, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
            jsonb_build_object('display_name', left(coalesce(nullif(btrim(p_display_name), ''), 'TikTok user'), 60), 'login_provider', 'tiktok'),
            now(), now(), '', '', '', '')
    returning id into v_user;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), v_user, v_user::text, jsonb_build_object('sub', v_user::text, 'email', v_email), 'email', now(), now(), now());
    insert into public.tiktok_identities (open_id, user_id) values (p_open_id, v_user);
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
    where id = v_user returning email into v_email;
  end if;
  return v_email;
end;
$$;

revoke all on function public.tiktok_login(text, text, text) from public, anon, authenticated;
grant execute on function public.tiktok_login(text, text, text) to service_role;
