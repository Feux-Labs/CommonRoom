import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;

  const { data: existing, error: readError } = await auth.supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (readError) return apiError('like_failed', 'This post could not be updated.', 500);

  if (existing) {
    const { error } = await auth.supabase
      .from('post_likes')
      .delete()
      .eq('post_id', id)
      .eq('user_id', auth.user.id);
    if (error) return apiError('like_failed', 'Your reaction could not be removed.', 500);
    return apiSuccess({ liked: false });
  }

  const { error } = await auth.supabase.from('post_likes').insert({
    post_id: id,
    user_id: auth.user.id,
  });
  if (error) return apiError('like_failed', 'Your reaction could not be saved.', 500);
  void auth.supabase.from('room_events').insert({ user_id: auth.user.id, post_id: id, event_type: 'like' });
  return apiSuccess({ liked: true });
}
