import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { communityError, type CommunityRow } from '@/lib/communities';

/** POST /api/v1/communities/[slug]/report { reason }: goes to the admin moderation queue. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.reason !== 'string') return apiError('invalid_reason', 'Add a short reason (3 to 500 characters).', 422);
  const { data: found } = await auth.supabase.rpc('get_community', { p_slug: slug });
  const row = ((found ?? []) as CommunityRow[])[0];
  if (!row) return apiError('community_not_found', 'That community could not be found.', 404);
  const { error } = await auth.supabase.rpc('report_community', { p_community_id: row.id, p_reason: body.reason });
  if (error) return communityError(error, 'Your report could not be sent.');
  return apiSuccess({ reported: true }, 201);
}
