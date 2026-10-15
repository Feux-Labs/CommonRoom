import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function GET(request: Request) {
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('get_anonymous_identity');
  if (error) return anonymousRpcError(error, 'Your Anonymous identity could not be loaded.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null);
}

export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.handle !== 'string') return anonymousInvalidBody('Choose an Anonymous name.');
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('register_anonymous_identity', { p_handle: body.handle });
  if (error) return anonymousRpcError(error, 'Your Anonymous identity could not be saved.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
