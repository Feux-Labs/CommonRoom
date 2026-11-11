import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

/** GET /api/v1/anonymous/inbox/sent: conversations you started by messaging someone's link, so you can read their replies. */
export async function GET(request: Request) {
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_sent_threads');
  if (error) return anonymousRpcError(error, 'Your sent messages could not be loaded.');
  return apiSuccess(data ?? []);
}
