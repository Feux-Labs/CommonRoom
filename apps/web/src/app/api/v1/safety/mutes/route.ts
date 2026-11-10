import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { safetyError, USER_ID_PATTERN } from '@/lib/safety';

/** GET /api/v1/safety/mutes: people I have muted. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data, error } = await auth.supabase.rpc('list_muted_users');
  if (error) return safetyError(error, 'Your muted accounts could not be loaded.');
  return apiSuccess(data ?? []);
}

async function userIdFrom(request: Request): Promise<string | null> {
  const body = await parseJson(request);
  return isRecord(body) && typeof body.userId === 'string' && USER_ID_PATTERN.test(body.userId) ? body.userId : null;
}

/** POST /api/v1/safety/mutes { userId }: stop seeing someone's posts and comments. They are not told. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const userId = await userIdFrom(request);
  if (!userId) return apiError('invalid_body', 'Choose who to mute.', 400);
  const { error } = await auth.supabase.rpc('mute_user', { p_user_id: userId });
  if (error) return safetyError(error, 'They could not be muted.');
  return apiSuccess({ muted: true });
}

/** DELETE /api/v1/safety/mutes { userId }: unmute someone. */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const userId = await userIdFrom(request);
  if (!userId) return apiError('invalid_body', 'Choose who to unmute.', 400);
  const { error } = await auth.supabase.rpc('unmute_user', { p_user_id: userId });
  if (error) return safetyError(error, 'They could not be unmuted.');
  return apiSuccess({ muted: false });
}
