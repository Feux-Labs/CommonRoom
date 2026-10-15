import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('toggle_anonymous_post_like', { p_post_id: id });
  if (error) return anonymousRpcError(error, 'Your reaction could not be saved.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null);
}
