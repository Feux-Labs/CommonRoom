import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { safetyError, USER_ID_PATTERN } from '@/lib/safety';

/** GET /api/v1/safety/relationship/<id>: have I blocked / muted this person? (Only ever about MY actions.) */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!USER_ID_PATTERN.test(id)) return apiError('invalid_user', 'That person could not be found.', 400);
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data, error } = await auth.supabase.rpc('my_relationship', { p_user_id: id });
  if (error) return safetyError(error, 'This could not be checked.');
  const row = (data as Array<{ blocked: boolean; muted: boolean }> | null)?.[0];
  return apiSuccess({ blocked: row?.blocked === true, muted: row?.muted === true });
}
