import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_inbox_prompt', { p_token: token });
  if (error) return anonymousRpcError(error, 'This anonymous link could not be opened.');
  const prompt = Array.isArray(data) ? data[0] : null;
  if (!prompt) return apiSuccess({ enabled: false }, 404);
  return apiSuccess(prompt);
}
