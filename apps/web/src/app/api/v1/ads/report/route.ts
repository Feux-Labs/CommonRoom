import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/v1/ads/report { id, reason }: report a sponsored post. It goes to the admin moderation queue. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.id !== 'string' || !uuid.test(body.id) || typeof body.reason !== 'string') return apiError('invalid_input', 'Send the ad and a reason.', 422);
  const { error } = await auth.supabase.rpc('report_ad', { p_ad_id: body.id, p_reason: body.reason });
  if (error) {
    if (error.message.includes('invalid_reason')) return apiError('invalid_reason', 'Add a short reason (3 to 500 characters).', 422);
    if (error.message.includes('ad_not_found')) return apiError('not_found', 'That ad is no longer running.', 404);
    if (error.message.includes('anonymous_rate_limit_exceeded')) return apiError('rate_limited', 'You’re reporting too often. Try again later.', 429);
    return apiError('report_failed', 'Your report could not be sent.', 500);
  }
  return apiSuccess({ reported: true }, 201);
}
