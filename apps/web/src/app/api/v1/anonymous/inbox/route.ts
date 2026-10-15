import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

export async function GET(request: Request) {
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_inbox_threads');
  if (error) return anonymousRpcError(error, 'Your Inbox could not be loaded.');
  return apiSuccess(data ?? []);
}
