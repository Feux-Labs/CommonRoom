import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('delete_anonymous_post', { p_post_id: id });
  if (error) return anonymousRpcError(error, 'Your post could not be deleted.');
  if (!data) return apiSuccess({ deleted: false }, 404);
  return apiSuccess({ deleted: true });
}
