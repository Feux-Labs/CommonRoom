import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

const events = ['app_open', 'post_view', 'post_share', 'profile_view', 'listing_view', 'nudge_click'];
const targetKinds = ['room', 'anonymous', 'listing', 'profile'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  return apiSuccess({ ok: true }, 201);
}
