import { randomUUID } from 'node:crypto';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { mediaUrlFor } from '@/lib/media-url';
import { objectSize, R2NotConfiguredError } from '@/lib/r2';
import { scheduleMediaScan } from '@/lib/moderation/media-scan';
import { anonymousTextProblem } from '@/lib/text-filter';
import { PaymentsNotConfiguredError } from '@/lib/payments/paystack';
import { startAdCheckout } from '@/lib/ads-checkout';
import { adPriceKobo, buildContact, FREE_AD_DAYS, isAdDays, isValidTarget, MAX_TARGETS, OBJECTIVES, type AdObjective } from '@/lib/ads';

type MineRow = {
  id: string; advertiser: string; title: string; body: string; objective: string; status: string; days: number; price_kobo: number;
  targets: string[]; starts_at: Date; ends_at: Date | null; media_type: string; media_path: string | null; cta_label: string; removed: boolean;
  views: bigint; clicks: bigint; people: bigint;
};

const MEDIA_EXTENSIONS: Record<string, 'photo' | 'video'> = { jpg: 'photo', png: 'photo', webp: 'photo', mp4: 'video', mov: 'video', webm: 'video' };

/** GET /api/v1/ads/campaigns: your own campaigns with views, clicks and click rate. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const rows = await prisma.$queryRaw<MineRow[]>`
    select a.id::text as id, a.advertiser, a.title, a.body, a.objective, a.status, a.days, a.price_kobo, a.targets, a.starts_at, a.ends_at, a.media_type, a.media_path, a.cta_label,
      exists (select 1 from public.content_reports r where r.target_kind = 'ad' and r.target_id = a.id and r.status = 'actioned') as removed,
      (select count(*) from public.app_events e where e.target_id = a.id and e.event = 'ad_view') as views,
      (select count(*) from public.app_events e where e.target_id = a.id and e.event = 'ad_click') as clicks,
      (select count(distinct e.user_id) from public.app_events e where e.target_id = a.id and e.event = 'ad_view') as people
    from public.ads a where a.owner_id = ${auth.user.id}::uuid order by a.created_at desc limit 50`;
  const credit = await prisma.$queryRaw<Array<{ free_ad_days: number }>>`select free_ad_days from public.user_entitlements where user_id = ${auth.user.id}::uuid`;
  return apiSuccess({
    freeAdDays: credit[0]?.free_ad_days ?? 0,
    campaigns: rows.map((row) => ({
      id: row.id, advertiser: row.advertiser, title: row.title, body: row.body, objective: row.objective, status: row.removed ? 'removed' : row.status, days: row.days,
      priceNaira: row.price_kobo / 100, targets: row.targets, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at ? row.ends_at.toISOString() : null,
      mediaType: row.media_type, mediaUrl: row.media_path ? mediaUrlFor(row.media_path) : null, ctaLabel: row.cta_label,
      views: Number(row.views), clicks: Number(row.clicks), people: Number(row.people),
    })),
  });
}

/**
 * POST /api/v1/ads/campaigns: create a campaign.
 * { advertiser, objective: website|whatsapp|call, contact, title, body?, mediaPath?, targets[], days: 1|5|7, useFreeDays? }
 * Paid campaigns go live when Paystack confirms the payment. With useFreeDays, a Pro member's 2 free days run it at once.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;
  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send the details of your ad.', 400);

  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const advertiser = text(body.advertiser, 60);
  const title = text(body.title, 80);
  const adBody = text(body.body, 200);
  const objective = body.objective as AdObjective;
  const useFree = body.useFreeDays === true;
  const days = useFree ? FREE_AD_DAYS : body.days;
  const targets = Array.isArray(body.targets) ? [...new Set(body.targets.filter((item): item is string => typeof item === 'string'))] : [];

  if (!advertiser || !title) return apiError('invalid_ad', 'Add your page or business name and a headline.', 422);
  if (anonymousTextProblem(advertiser, title, adBody)) return apiError('text_not_allowed', 'Keep phone numbers, emails and links out of the text. Put your number or link in the contact box.', 422);
  if (!OBJECTIVES.includes(objective)) return apiError('invalid_objective', 'Choose what you want: website visits, WhatsApp chats or calls.', 422);
  const contact = buildContact(objective, typeof body.contact === 'string' ? body.contact : '');
  if (!contact) {
    return apiError('invalid_contact', objective === 'website' ? 'Enter a website starting with https://' : objective === 'whatsapp' ? 'Enter a WhatsApp number, or a wa.me link.' : 'Enter a valid phone number.', 422);
  }
  if (!useFree && !isAdDays(days)) return apiError('invalid_duration', 'Choose 1, 5 or 7 days.', 422);
  if (targets.length < 1 || targets.length > MAX_TARGETS || !targets.every(isValidTarget)) {
    return apiError('invalid_targets', `Choose where it runs: up to ${MAX_TARGETS} places (schools, towns, states or all of Nigeria).`, 422);
  }

  // Optional photo or video, uploaded by this person through the upload endpoint (kind "ad-").
  let mediaPath: string | null = null;
  let mediaType: 'none' | 'photo' | 'video' = 'none';
  if (typeof body.mediaPath === 'string' && body.mediaPath) {
    const path = body.mediaPath;
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    if (!path.startsWith(`${auth.user.id}/ad-`) || path.includes('..') || !(extension in MEDIA_EXTENSIONS)) return apiError('invalid_media', 'Upload your photo or video again.', 422);
    try {
      if ((await objectSize(path)) === null) return apiError('invalid_media', 'Your upload didn’t finish. Try again.', 422);
    } catch (storageError) {
      if (storageError instanceof R2NotConfiguredError) return apiError('storage_not_configured', 'Uploads are not set up yet.', 503);
      return apiError('media_check_failed', 'Your media could not be checked. Try again.', 502);
    }
    mediaPath = path;
    mediaType = MEDIA_EXTENSIONS[extension];
  }

  // No pile of unpaid drafts.
  const pending = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.ads where owner_id = ${auth.user.id}::uuid and status = 'pending_payment'`;
  if (Number(pending[0]?.n ?? 0) >= 5) return apiError('too_many_unpaid', 'You have 5 unpaid ads. Pay for or remove one first.', 409);

  const adId = randomUUID();
  const priceKobo = useFree ? 0 : adPriceKobo(days as 1 | 5 | 7);
  const adDays = days as number;

  if (useFree) {
    // Spend the free days and start the ad in one step; it only works if the credit is really there.
    const spent = await prisma.$executeRaw`update public.user_entitlements set free_ad_days = free_ad_days - ${FREE_AD_DAYS}, updated_at = now() where user_id = ${auth.user.id}::uuid and free_ad_days >= ${FREE_AD_DAYS}`;
    if (spent === 0) return apiError('no_free_days', 'You have no free ad days left.', 409);
    await prisma.$executeRaw`
      insert into public.ads (id, owner_id, advertiser, title, body, cta_label, link_url, objective, media_type, media_path, targets, days, price_kobo, status, starts_at, ends_at)
      values (${adId}::uuid, ${auth.user.id}::uuid, ${advertiser}, ${title}, ${adBody}, ${contact.ctaLabel}, ${contact.linkUrl}, ${objective}, ${mediaType}, ${mediaPath}, ${targets}::text[], ${adDays}, 0, 'active', now(), now() + (${adDays} * interval '1 day'))`;
    if (mediaPath) scheduleMediaScan(auth.user.id, [mediaPath]);
    return apiSuccess({ id: adId, status: 'active', free: true }, 201);
  }

  const email = auth.user.email;
  if (!email) return apiError('email_required', 'Add an email to your account to pay.', 422);
  await prisma.$executeRaw`
    insert into public.ads (id, owner_id, advertiser, title, body, cta_label, link_url, objective, media_type, media_path, targets, days, price_kobo, status, starts_at, ends_at)
    values (${adId}::uuid, ${auth.user.id}::uuid, ${advertiser}, ${title}, ${adBody}, ${contact.ctaLabel}, ${contact.linkUrl}, ${objective}, ${mediaType}, ${mediaPath}, ${targets}::text[], ${adDays}, ${priceKobo}, 'pending_payment', now(), null)`;
  try {
    const checkout = await startAdCheckout(request, auth.user.id, email, adId, priceKobo);
    if (mediaPath) scheduleMediaScan(auth.user.id, [mediaPath]);
    return apiSuccess({ id: adId, status: 'pending_payment', authorizationUrl: checkout.authorizationUrl, reference: checkout.reference }, 201);
  } catch (error) {
    await prisma.$executeRaw`delete from public.ads where id = ${adId}::uuid and status = 'pending_payment'`;
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    console.error('Ad checkout could not be started.', error instanceof Error ? error.message : 'unknown');
    return apiError('checkout_failed', 'We could not start the payment. Try again.', 502);
  }
}
