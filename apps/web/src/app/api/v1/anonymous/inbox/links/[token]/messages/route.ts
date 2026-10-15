import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string') return anonymousInvalidBody('Write a message to send anonymously.');
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('send_anonymous_inbox_message', {
    p_token: token,
    p_body: body.body,
  });
  if (error) return anonymousRpcError(error, 'Your anonymous message could not be sent.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
