import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const { id } = await params;

  const { data: existing, error: readError } = await auth.supabase
    .from('post_saves')
    .select('post_id')
    .eq('post_id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (readError) return apiError('save_failed', 'This post could not be updated.', 500);

  if (existing) {
    const { error } = await auth.supabase.from('post_saves').delete().eq('post_id', id).eq('user_id', auth.user.id);
    if (error) return apiError('save_failed', 'This post could not be unsaved.', 500);
    return apiSuccess({ saved: false });
  }

  const { error } = await auth.supabase.from('post_saves').insert({ post_id: id, user_id: auth.user.id });
  if (error) return apiError('save_failed', 'This post could not be saved.', 500);
  void auth.supabase.from('room_events').insert({ user_id: auth.user.id, post_id: id, event_type: 'save' });
  return apiSuccess({ saved: true });
}
