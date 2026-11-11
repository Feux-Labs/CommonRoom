import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/insights?kind=anonymous|room&id=<post id>: views, viewers, likes, comments and shares. Only the post's author. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const id = params.get('id') ?? '';
  if ((kind !== 'anonymous' && kind !== 'room') || !uuid.test(id)) return apiError('invalid_input', 'Send kind and a post id.', 400);
  const { data, error } = await auth.supabase.rpc('post_insights', { p_kind: kind, p_post_id: id });
  if (error) {
    if (error.message.includes('not_your_post')) return apiError('forbidden', 'Only the author can see these numbers.', 403);
    return apiError('insights_failed', 'Could not load the numbers.', 500);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { views: number; viewers: number; likes: number; comments: number; shares: number } | undefined;
  return apiSuccess({
    views: Number(row?.views ?? 0), viewers: Number(row?.viewers ?? 0), likes: Number(row?.likes ?? 0),
    comments: Number(row?.comments ?? 0), shares: Number(row?.shares ?? 0),
  });
}
