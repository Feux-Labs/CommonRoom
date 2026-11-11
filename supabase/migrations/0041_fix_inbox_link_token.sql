-- Fix: creating an inbox link failed on Supabase ("function gen_random_bytes(integer) does not exist") because the
-- function looks in "public" only and pgcrypto lives in the "extensions" schema. Same function, token made from
-- extensions.gen_random_bytes (still 48 hex characters).
create or replace function public.create_anonymous_inbox_link()
returns table (token text, enabled boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if not exists (select 1 from public.anonymous_identities identity where identity.user_id = v_user_id) then
    raise exception 'anonymous_identity_required';
  end if;
  insert into public.anonymous_inbox_links (owner_id, token)
  values (v_user_id, encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (owner_id) do nothing;
  select link.token into v_token from public.anonymous_inbox_links link where link.owner_id = v_user_id;
  return query select v_token, link.enabled
    from public.anonymous_inbox_links link where link.owner_id = v_user_id;
end;
$$;
