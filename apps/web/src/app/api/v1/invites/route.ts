import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

function inviteCode(userId: string) {
  return `cr${userId.replace(/-/g, '').slice(0, 8)}`;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const { data: existing } = await auth.supabase
    .from('invites')
    .select('code, use_count')
    .eq('inviter_id', auth.user.id)
    .maybeSingle();

  if (existing) {
    const origin = new URL(request.url).origin;
    return apiSuccess({ code: existing.code, url: `${origin}/invite/${existing.code}`, uses: existing.use_count });
  }

  const code = inviteCode(auth.user.id);
  const { data, error } = await auth.supabase
    .from('invites')
    .insert({ code, inviter_id: auth.user.id })
    .select('code, use_count')
    .single();
  if (error) return apiError('invite_failed', 'Your invite link could not be created.', 500);

  const origin = new URL(request.url).origin;
  return apiSuccess({ code: data.code, url: `${origin}/invite/${data.code}`, uses: data.use_count });
}
