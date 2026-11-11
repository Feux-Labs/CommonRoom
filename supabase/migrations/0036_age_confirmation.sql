-- Everyone, guests included, must say they are 18 or older and accept the terms before they post, like, comment or
-- message. The answer is stored per visitor on the server, so the browser cannot skip it.
create table if not exists public.age_confirmations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confirmed_at timestamptz not null default timezone('utc', now()),
  terms_version text not null default '2026-11-10'
);
alter table public.age_confirmations enable row level security;
revoke all on public.age_confirmations from anon, authenticated;

-- True when this visitor has confirmed (or signed up with the 18+ box ticked, which saves the same fact on the profile).
create or replace function public.is_age_confirmed() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.age_confirmations where user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and age_eligibility_confirmed is true)
  );
$$;

create or replace function public.confirm_age_and_terms(p_terms_version text default '2026-11-10') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  insert into public.age_confirmations (user_id, terms_version) values (auth.uid(), left(coalesce(nullif(btrim(p_terms_version), ''), '2026-11-10'), 20))
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.is_age_confirmed(), public.confirm_age_and_terms(text) from public, anon;
grant execute on function public.is_age_confirmed(), public.confirm_age_and_terms(text) to authenticated;
