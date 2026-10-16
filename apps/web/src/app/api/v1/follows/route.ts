import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || body.userId === auth.user.id) {
    return apiError('invalid_user', 'Choose a different account to follow.', 422);
  }

  const { error } = await auth.supabase.from('follows').upsert({
    follower_id: auth.user.id,
    following_id: body.userId,
  }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
  if (error) return apiError('follow_failed', 'This account could not be followed.', 500);
  return apiSuccess({ following: true });
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string') {
    return apiError('invalid_user', 'Choose an account to unfollow.', 422);
  }

  const { error } = await auth.supabase
    .from('follows')
    .delete()
    .eq('follower_id', auth.user.id)
    .eq('following_id', body.userId);
  if (error) return apiError('unfollow_failed', 'This account could not be unfollowed.', 500);
  return apiSuccess({ following: false });
}
