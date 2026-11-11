import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { mediaUrlFor } from '@/lib/media-url';
import { viewerKeys } from '@/lib/ads';

type AdRow = {
  id: string; advertiser: string; title: string; body: string; image_url: string | null; cta_label: string; link_url: string;
  objective: string; media_type: string; media_path: string | null;
};

const placements = ['anonymous_feed', 'room', 'marketplace'];

/**
 * GET /api/v1/ads?placement=anonymous_feed|room|marketplace: at most one sponsored post for this visitor, or none.
 * Everyone can see sponsored posts, Pro members included. An ad runs where its advertiser chose: any mix of schools, towns,
 * states or all of Nigeria. The viewer's school is only used on the server to match; it is never sent out.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const placement = new URL(request.url).searchParams.get('placement') ?? '';
  if (!placements.includes(placement)) return apiError('invalid_placement', 'Unknown placement.', 400);

  try {
    const profile = await prisma.$queryRaw<Array<{ school: string | null }>>`select school from public.profiles where id = ${auth.user.id}::uuid`;
    const keys = viewerKeys(profile[0]?.school);
    const rows = await prisma.$queryRaw<AdRow[]>`
      select a.id::text as id, a.advertiser, a.title, a.body, a.image_url, a.cta_label, a.link_url, a.objective, a.media_type, a.media_path
      from public.ads a
      where a.status = 'active' and ${placement} = any(a.placements) and a.ends_at is not null and now() between a.starts_at and a.ends_at
        and (cardinality(a.targets) = 0 or a.targets && ${keys}::text[])
      order by random()
      limit 1`;
    const ad = rows[0];
    if (!ad) return apiSuccess(null);
    const mediaUrl = ad.media_path ? mediaUrlFor(ad.media_path) : ad.image_url;
    return apiSuccess({
      id: ad.id, advertiser: ad.advertiser, title: ad.title, body: ad.body, objective: ad.objective, ctaLabel: ad.cta_label, linkUrl: ad.link_url,
      mediaType: ad.media_path ? ad.media_type : ad.image_url ? 'photo' : 'none', mediaUrl: mediaUrl ?? null,
    });
  } catch (error) {
    // An ad problem must never break the feed.
    console.error('Ad lookup failed.', error instanceof Error ? error.message : 'unknown');
    return apiSuccess(null);
  }
}
