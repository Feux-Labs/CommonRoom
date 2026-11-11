-- Self-serve advertising. Any member can buy a campaign: choose a goal (website, WhatsApp chat or call), upload a photo or
-- video, pick where it runs (any mix of schools, towns, states or all of Nigeria) and pay with Paystack. It goes live the
-- moment the payment is confirmed. Pro members also get 2 free ad days with their first subscription.
-- Ads from the admin console keep working exactly as before.
alter table public.ads
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists objective text not null default 'website' check (objective in ('website', 'whatsapp', 'call')),
  add column if not exists media_type text not null default 'none' check (media_type in ('none', 'photo', 'video')),
  add column if not exists media_path text,
  add column if not exists targets text[] not null default '{}',
  add column if not exists placements text[] not null default array['anonymous_feed', 'room', 'marketplace'],
  add column if not exists days integer not null default 7 check (days between 1 and 365),
  add column if not exists price_kobo integer not null default 0 check (price_kobo >= 0);

alter table public.ads drop constraint if exists ads_status_check;
alter table public.ads add constraint ads_status_check check (status in ('pending_payment', 'active', 'paused'));
alter table public.ads drop constraint if exists ads_link_url_check;
alter table public.ads add constraint ads_link_url_check check (link_url ~ '^https://' or link_url ~ '^tel:\+[0-9]{8,15}$');
alter table public.ads drop constraint if exists ads_placement_check;
alter table public.ads drop constraint if exists ads_cta_label_check;
alter table public.ads add constraint ads_cta_label_check check (char_length(cta_label) between 1 and 30);
alter table public.ads alter column ends_at drop not null;
alter table public.ads drop constraint if exists ads_check;
alter table public.ads add constraint ads_check check (ends_at is null or ends_at > starts_at);
create index if not exists ads_owner_idx on public.ads (owner_id, created_at desc);

alter table public.user_entitlements add column if not exists free_ad_days integer not null default 0 check (free_ad_days >= 0);

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
