import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

/**
 * GET /api/v1/anonymous/identity/suggestion: an Anonymous ID nobody has ever had (and nobody will be given after you; IDs are never reused).
 * It never runs out: if random picks keep colliding it falls back to a counter that only goes up.
 */
export async function GET(request: Request) {
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('suggest_anonymous_handle');
  if (error) return anonymousRpcError(error, 'An Anonymous ID could not be suggested.');
  return apiSuccess({ handle: data as string });
}
