import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function GET(request: Request) {
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_inbox_link');
  if (error) return anonymousRpcError(error, 'Your personal anonymous link could not be loaded.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null);
}

export async function POST(request: Request) {
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('create_anonymous_inbox_link');
  if (error) return anonymousRpcError(error, 'Your personal anonymous link could not be created.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}

export async function PATCH(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.enabled !== 'boolean') return anonymousInvalidBody('Choose whether your link should be enabled.');
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('set_anonymous_inbox_link_enabled', {
    p_enabled: body.enabled,
  });
  if (error) return anonymousRpcError(error, 'Your link setting could not be updated.');
  if (data !== true) return apiSuccess({ enabled: false }, 404);
  return apiSuccess({ enabled: body.enabled });
}
