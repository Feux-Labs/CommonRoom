import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.messageId !== 'string'
    || (body.scope !== 'school' && body.scope !== 'all_nigerian_schools')) {
    return anonymousInvalidBody('Choose a message and a public audience to share it.');
  }
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('share_anonymous_inbox_message', {
    p_thread_id: id,
    p_message_id: body.messageId,
    p_scope: body.scope,
  });
  if (error) return anonymousRpcError(error, 'The selected message could not be shared.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
