import { apiError, apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';
import { rejectUnsafeAnonymousText } from '@/lib/text-filter';
import { isFlagEnabled } from '@/lib/flags';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!(await isFlagEnabled('anonymous_inbox'))) return apiError('feature_disabled', 'Inbox messages are paused for a moment. Please try again later.', 503);
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string') return anonymousInvalidBody('Write a message to send anonymously.');
  const unsafe = rejectUnsafeAnonymousText(body.body);
  if (unsafe) return unsafe;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('send_anonymous_inbox_message', {
    p_token: token,
    p_body: body.body,
  });
  if (error) return anonymousRpcError(error, 'Your anonymous message could not be sent.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
