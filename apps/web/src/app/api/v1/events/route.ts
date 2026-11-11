import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { describeClient } from '@/lib/ua';

const events = ['app_open', 'post_view', 'post_share', 'profile_view', 'listing_view', 'nudge_click', 'ad_view', 'ad_click'];
const targetKinds = ['room', 'anonymous', 'listing', 'profile', 'ad'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headerText(request: Request, name: string): string | null {
  const value = request.headers.get(name);
  if (!value) return null;
  try { return decodeURIComponent(value).slice(0, 80); } catch { return value.slice(0, 80); }
}

/** POST /api/v1/events: records one usage event for the current visitor (guest or member). Best effort. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  let body: Record<string, unknown> | null = null;
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* handled below */ }
  if (!body || typeof body.event !== 'string' || !events.includes(body.event)
    || (body.targetKind != null && (typeof body.targetKind !== 'string' || !targetKinds.includes(body.targetKind)))
    || (body.targetId != null && (typeof body.targetId !== 'string' || !uuid.test(body.targetId)))
    || (body.source != null && typeof body.source !== 'string')) {
    return apiError('invalid_event', 'That event is not valid.', 400);
  }
  const { error } = await auth.supabase.rpc('track_event', {
    p_event: body.event,
    p_target_kind: body.targetKind ?? null,
    p_target_id: body.targetId ?? null,
    p_source: body.source ?? null,
  });
  if (error) return apiError('event_failed', 'Could not record that.', 500);

  // Who is visiting, roughly: the country and city the hosting network reports, and the kind of device. Counted once per
  // visit. Never an exact location, and never tied to a name.
  if (body.event === 'app_open') {
    try {
      const client = describeClient(request.headers.get('user-agent') ?? '');
      const country = request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry');
      await prisma.$executeRaw`
        insert into public.visitor_profiles (user_id, country, region, city, device, os, browser)
        values (${auth.user.id}::uuid, ${country}, ${headerText(request, 'x-vercel-ip-country-region')}, ${headerText(request, 'x-vercel-ip-city')}, ${client.device}, ${client.os}, ${client.browser})
        on conflict (user_id) do update set last_seen = now(), visits = public.visitor_profiles.visits + 1,
          country = coalesce(excluded.country, public.visitor_profiles.country), region = coalesce(excluded.region, public.visitor_profiles.region),
          city = coalesce(excluded.city, public.visitor_profiles.city), device = excluded.device, os = excluded.os, browser = excluded.browser`;
    } catch {
      // Demographics are a bonus; the event itself is already saved.
    }
  }
  return apiSuccess({ ok: true }, 201);
}
