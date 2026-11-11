import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/insights/detail?kind=anonymous|room&id=: everything the Insights page shows. Only the post's author. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const id = params.get('id') ?? '';
  if ((kind !== 'anonymous' && kind !== 'room') || !uuid.test(id)) return apiError('invalid_input', 'Send kind and a post id.', 400);
  const { data, error } = await auth.supabase.rpc('post_insights_detail', { p_kind: kind, p_post_id: id });
  if (error) {
    if (error.message.includes('not_your_post')) return apiError('forbidden', 'Only the author can see these numbers.', 403);
    return apiError('insights_failed', 'Could not load the numbers.', 500);
  }
  return apiSuccess(data);
}
