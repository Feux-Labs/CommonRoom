import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_inbox_messages', { p_thread_id: id });
  if (error) return anonymousRpcError(error, 'This private conversation could not be loaded.');
  return apiSuccess(data ?? []);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string') return anonymousInvalidBody('Write a reply.');
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('reply_anonymous_inbox_thread', {
    p_thread_id: id,
    p_body: body.body,
  });
  if (error) return anonymousRpcError(error, 'Your private reply could not be sent.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
