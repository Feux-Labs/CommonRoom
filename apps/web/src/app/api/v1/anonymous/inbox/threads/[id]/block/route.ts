import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('block_anonymous_thread', { p_thread_id: id });
  if (error) return anonymousRpcError(error, 'This conversation could not be blocked.');
  return apiSuccess({ blocked: data === true }, 201);
}
