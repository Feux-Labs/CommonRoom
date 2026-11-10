import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { safetyError, USER_ID_PATTERN } from '@/lib/safety';

/** GET /api/v1/safety/blocks: people I have blocked. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data, error } = await auth.supabase.rpc('list_blocked_users');
  if (error) return safetyError(error, 'Your blocked accounts could not be loaded.');
  return apiSuccess(data ?? []);
}

async function userIdFrom(request: Request): Promise<string | null> {
  const body = await parseJson(request);
  return isRecord(body) && typeof body.userId === 'string' && USER_ID_PATTERN.test(body.userId) ? body.userId : null;
}

/** POST /api/v1/safety/blocks { userId }: block someone. Follows between you are removed. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const userId = await userIdFrom(request);
  if (!userId) return apiError('invalid_body', 'Choose who to block.', 400);
  const { error } = await auth.supabase.rpc('block_user', { p_user_id: userId });
  if (error) return safetyError(error, 'They could not be blocked.');
  return apiSuccess({ blocked: true });
}

/** DELETE /api/v1/safety/blocks { userId }: unblock someone. */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const userId = await userIdFrom(request);
  if (!userId) return apiError('invalid_body', 'Choose who to unblock.', 400);
  const { error } = await auth.supabase.rpc('unblock_user', { p_user_id: userId });
  if (error) return safetyError(error, 'They could not be unblocked.');
  return apiSuccess({ blocked: false });
}
