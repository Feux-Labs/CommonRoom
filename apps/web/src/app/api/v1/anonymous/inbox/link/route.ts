import { apiSuccess } from '@/lib/supabase-server';
import { rejectUnsafeAnonymousText } from '@/lib/text-filter';
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

const promptThemes = ['blue-hour', 'soft-sky', 'warm-glow', 'rose-note'];

/** Sets the headline people see on your link ("Are you my crush?") and its colour. An empty prompt goes back to the default. */
async function updatePrompt(request: Request, body: Record<string, unknown>) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.replace(/\s+/g, ' ').trim() : '';
  if (typeof body.prompt !== 'string' || prompt.length > 140
    || (body.theme !== undefined && (typeof body.theme !== 'string' || !promptThemes.includes(body.theme)))) {
    return anonymousInvalidBody('Write a prompt of up to 140 characters and choose a colour.');
  }
  const unsafe = rejectUnsafeAnonymousText(prompt);
  if (unsafe) return unsafe;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('set_anonymous_inbox_prompt', { p_prompt: prompt, p_theme: (body.theme as string | undefined) ?? 'blue-hour' });
  if (error) return anonymousRpcError(error, 'Your prompt could not be saved.');
  if (data !== true) return apiSuccess({ saved: false }, 404);
  return apiSuccess({ prompt: prompt || null, theme: prompt ? (body.theme as string | undefined) ?? 'blue-hour' : null });
}

export async function PATCH(request: Request) {
  const body = await parseAnonymousBody(request);
  if (body && 'prompt' in body) return updatePrompt(request, body);
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
