import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;
  const body = await parseJson(request);
  const reason = isRecord(body) && typeof body.reason === 'string' ? body.reason.trim() : 'Inappropriate content';
  if (reason.length < 3 || reason.length > 500) {
    return apiError('invalid_report', 'Tell us briefly why you are reporting this post.', 422);
  }

  const { error } = await auth.supabase.from('post_reports').insert({
    post_id: id,
    reporter_id: auth.user.id,
    reason,
  });
  if (error) return apiError('report_failed', 'This post could not be reported.', 500);
  return apiSuccess({ reported: true });
}
