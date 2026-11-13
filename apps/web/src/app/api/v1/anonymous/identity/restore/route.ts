import { apiError, apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

type Row = { status: 'ok' | 'failed' | 'locked' | 'exists' | 'forbidden'; handle: string | null; moved: number };

/**
 * POST /api/v1/anonymous/identity/restore { handle, code, replace? }: get an Anonymous ID back on this phone. The ID is public,
 * so it only works together with the private recovery code shown when the ID was made. Posts, comments, inbox and conversations move here.
 */
export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.handle !== 'string' || typeof body.code !== 'string') return anonymousInvalidBody('Enter your Anonymous ID and your recovery code.');
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('restore_anonymous_identity', { p_handle: body.handle, p_code: body.code, p_replace: body.replace === true });
  if (error) return anonymousRpcError(error, 'Your Anonymous ID could not be restored.');
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row) return apiError('anonymous_request_failed', 'Your Anonymous ID could not be restored.', 500);
  switch (row.status) {
    case 'ok': return apiSuccess({ handle: row.handle, moved: row.moved });
    case 'locked': return apiError('anonymous_restore_locked', 'Too many wrong codes for that ID. Try again in an hour.', 429);
    case 'exists': return apiError('anonymous_identity_exists', 'This phone already has an Anonymous ID.', 409);
    case 'forbidden': return apiError('anonymous_restore_not_allowed', 'That ID belongs to an account. Sign in to that account to use it.', 403);
    default: return apiError('anonymous_restore_failed', 'That ID and code do not match.', 403);
  }
}
