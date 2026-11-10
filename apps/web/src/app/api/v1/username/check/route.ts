import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { normaliseUsername, usernameError } from '@/lib/username';

/** GET /api/v1/username/check?u=name: is this @username free? Works for guest sessions (used while signing up). */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const username = normaliseUsername(new URL(request.url).searchParams.get('u'));
  const problem = usernameError(username);
  if (problem) return apiSuccess({ username, available: false, reason: problem });

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) return apiError('username_check_failed', 'We could not check that username. Try again.', 500);
  const mine = data?.id === auth.user.id;
  return apiSuccess({ username, available: !data || mine, reason: data && !mine ? 'That username is taken.' : null });
}
