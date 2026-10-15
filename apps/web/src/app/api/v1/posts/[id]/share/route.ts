import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;

  const { error } = await auth.supabase.from('post_shares').insert({ post_id: id, user_id: auth.user.id });
  if (error) return apiError('share_failed', 'This post could not be shared.', 500);
  void auth.supabase.from('room_events').insert({ user_id: auth.user.id, post_id: id, event_type: 'share' });

  const origin = new URL(request.url).origin;
  return apiSuccess({ url: `${origin}/posts/${id}` });
}
