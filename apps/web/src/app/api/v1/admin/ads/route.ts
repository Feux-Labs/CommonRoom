import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { mediaUrlFor } from '@/lib/media-url';
import { objectSize } from '@/lib/r2';

type AdRow = {
  id: string; advertiser: string; title: string; body: string; image_url: string | null; cta_label: string; link_url: string;
  media_type: string; media_path: string | null; placements: string[]; placement: string; school: string | null; starts_at: Date; ends_at: Date | null; status: string; owner_id: string | null; targets: string[]; objective: string; price_kobo: number; views: bigint; clicks: bigint; people: bigint;
};

const https = /^https:\/\/[^\s]+$/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try { const value = await request.json(); return isRecord(value) ? value : null; } catch { return null; }
}

/** GET /api/v1/admin/ads: every ad with its views, clicks and click rate. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'ads');
  if (!isAdminAuthenticated(auth)) return auth;
  const rows = await prisma.$queryRaw<AdRow[]>`
    select a.id::text as id, a.advertiser, a.title, a.body, a.image_url, a.cta_label, a.link_url, a.media_type, a.media_path, a.placements, a.placement, a.school, a.starts_at, a.ends_at, a.status, a.owner_id::text as owner_id, a.targets, a.objective, a.price_kobo,
      (select count(*) from public.app_events e where e.target_id = a.id and e.event = 'ad_view') as views,
      (select count(*) from public.app_events e where e.target_id = a.id and e.event = 'ad_click') as clicks,
      (select count(distinct e.user_id) from public.app_events e where e.target_id = a.id and e.event = 'ad_view') as people
    from public.ads a order by a.created_at desc limit 100`;
  return apiSuccess(rows.map((row) => ({
    id: row.id, advertiser: row.advertiser, title: row.title, body: row.body, imageUrl: row.image_url, ctaLabel: row.cta_label, linkUrl: row.link_url,
    placement: row.placement, placements: row.placements, mediaType: row.media_path ? row.media_type : row.image_url ? 'photo' : 'none', mediaUrl: row.media_path ? mediaUrlFor(row.media_path) : row.image_url, school: row.school, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at ? row.ends_at.toISOString() : null, status: row.status,
    selfServe: row.owner_id !== null, targets: row.targets, objective: row.objective, priceNaira: row.price_kobo / 100,
    views: Number(row.views), clicks: Number(row.clicks), people: Number(row.people),
  })));
}

/** POST /api/v1/admin/ads: create an ad. Links and images must be https. */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'ads');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await readBody(request);
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const advertiser = text(body?.advertiser, 60);
  const title = text(body?.title, 80);
  const adBody = text(body?.body, 200);
  const cta = text(body?.ctaLabel, 24) || 'Learn more';
  const linkUrl = text(body?.linkUrl, 500);
  const imageUrl = text(body?.imageUrl, 500) || null;
  const school = text(body?.school, 120) || null;
  const days = Number(body?.days);
  const allowed = ['anonymous_feed', 'room', 'marketplace', 'overlay'];
  const placements = Array.isArray(body?.placements) ? [...new Set(body.placements.filter((item): item is string => typeof item === 'string' && allowed.includes(item)))] : ['anonymous_feed', 'room', 'marketplace'];
  if (!body || !advertiser || !title || !https.test(linkUrl) || (imageUrl && !https.test(imageUrl)) || !Number.isFinite(days) || days < 1 || days > 365) {
    return apiError('invalid_ad', 'Add an advertiser, a title, an https link, and how many days it should run (1 to 365).', 422);
  }
  if (placements.length === 0) return apiError('invalid_placement', 'Choose where it should show: the feeds, Marketplace, or the overlay.', 422);

  // Graphics: a photo or video the staff member uploaded (kind "ad-"), stored under their own account.
  let mediaPath: string | null = null;
  let mediaType = 'none';
  if (typeof body.mediaPath === 'string' && body.mediaPath) {
    const extension = body.mediaPath.split('.').pop()?.toLowerCase() ?? '';
    const kinds: Record<string, string> = { jpg: 'photo', png: 'photo', webp: 'photo', mp4: 'video', mov: 'video', webm: 'video' };
    if (!body.mediaPath.startsWith(`${auth.user.id}/ad-`) || body.mediaPath.includes('..') || !(extension in kinds)) return apiError('invalid_media', 'Upload the graphic again.', 422);
    try {
      if ((await objectSize(body.mediaPath)) === null) return apiError('invalid_media', 'The upload did not finish. Try again.', 422);
    } catch {
      return apiError('media_check_failed', 'The graphic could not be checked. Try again.', 502);
    }
    mediaPath = body.mediaPath;
    mediaType = kinds[extension];
  }
  const created = await prisma.$queryRaw<Array<{ id: string }>>`
    insert into public.ads (advertiser, title, body, image_url, cta_label, link_url, school, targets, days, placements, media_type, media_path, ends_at)
    values (${advertiser}, ${title}, ${adBody}, ${imageUrl}, ${cta}, ${linkUrl}, ${school}, ${school ? [`school:${school}`] : []}::text[], ${days}, ${placements}::text[], ${mediaType}, ${mediaPath}, now() + (${days} * interval '1 day'))
    returning id::text as id`;
  return apiSuccess({ id: created[0]?.id }, 201);
}

/** PATCH /api/v1/admin/ads { id, status }: pause or resume. */
export async function PATCH(request: Request) {
  const auth = await authenticateAdmin(request, 'ads');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await readBody(request);
  if (!body || typeof body.id !== 'string' || !uuid.test(body.id) || (body.status !== 'active' && body.status !== 'paused')) {
    return apiError('invalid_input', 'Send an ad id and a status of active or paused.', 400);
  }
  const updated = await prisma.$executeRaw`update public.ads set status = ${body.status} where id = ${body.id}::uuid`;
  if (updated === 0) return apiError('not_found', 'That ad does not exist.', 404);
  return apiSuccess({ id: body.id, status: body.status });
}

/** DELETE /api/v1/admin/ads { id } */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request, 'ads');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await readBody(request);
  if (!body || typeof body.id !== 'string' || !uuid.test(body.id)) return apiError('invalid_input', 'Send an ad id.', 400);
  await prisma.$executeRaw`delete from public.ads where id = ${body.id}::uuid`;
  return apiSuccess({ deleted: true });
}
