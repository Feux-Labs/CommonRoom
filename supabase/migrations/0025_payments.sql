-- Payments (Paystack). The server creates a pending row with the price it decided, Paystack confirms the charge,
-- and apply_payment_success() records it once and grants what was bought. Nothing here is writable from the public API.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (char_length(product) between 1 and 60),
  product_ref text check (product_ref is null or char_length(product_ref) <= 100),
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  reference text not null unique check (char_length(reference) between 10 and 100),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  provider_id text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pro_until timestamptz,
  ultimate_pass boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.payments enable row level security;
alter table public.user_entitlements enable row level security;
revoke all on public.payments from anon, authenticated;
revoke all on public.user_entitlements from anon, authenticated;
grant select (id, product, product_ref, amount_kobo, currency, status, paid_at, created_at) on public.payments to authenticated;
grant select on public.user_entitlements to authenticated;

drop policy if exists "Users read their payments" on public.payments;
create policy "Users read their payments" on public.payments for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users read their entitlements" on public.user_entitlements;
create policy "Users read their entitlements" on public.user_entitlements for select to authenticated using (user_id = (select auth.uid()));

-- Records a confirmed payment exactly once and grants the product. Returns 'applied', 'already' or 'unknown'.
create or replace function public.apply_payment_success(p_reference text, p_provider_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if v_payment.status = 'success' then return 'already'; end if;

  update public.payments set status = 'success', provider_id = p_provider_id, paid_at = timezone('utc', now())
  where id = v_payment.id;

  if v_payment.product = 'pro_month' then
    insert into public.user_entitlements (user_id, pro_until)
    values (v_payment.user_id, timezone('utc', now()) + interval '30 days')
    on conflict (user_id) do update
    set pro_until = greatest(coalesce(public.user_entitlements.pro_until, timezone('utc', now())), timezone('utc', now())) + interval '30 days',
        updated_at = timezone('utc', now());
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
$$;

-- A charge that did not complete. Never downgrades a successful payment.
create or replace function public.mark_payment_unsuccessful(p_reference text, p_status text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.payments set status = p_status
  where reference = p_reference and status = 'pending' and p_status in ('failed', 'abandoned');
$$;

revoke all on function public.apply_payment_success(text, text) from public, anon, authenticated;
grant execute on function public.apply_payment_success(text, text) to service_role;
revoke all on function public.mark_payment_unsuccessful(text, text) from public, anon, authenticated;
grant execute on function public.mark_payment_unsuccessful(text, text) to service_role;
