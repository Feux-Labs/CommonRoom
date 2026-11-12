import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  const code = isRecord(body) && typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  if (!code) return apiError('invalid_invite', 'Paste an invite code.', 422);

  const { data: invite, error } = await auth.supabase
    .from('invites')
    .select('code, inviter_id, use_count')
    .eq('code', code)
    .maybeSingle();
  if (error) return apiError('invite_failed', 'This invite could not be checked.', 500);
  if (!invite) return apiError('invite_not_found', 'That invite is invalid or expired.', 404);
  if (invite.inviter_id === auth.user.id) {
    return apiError('invite_self', 'You cannot redeem your own invite.', 422);
  }

  await auth.supabase.from('follows').upsert(
    [
      { follower_id: auth.user.id, following_id: invite.inviter_id },
      { follower_id: invite.inviter_id, following_id: auth.user.id },
    ],
    { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
  );
  // Each person can be invited once, so one account cannot pump an inviter's count (which feeds their rank points).
  const fresh = await prisma.$queryRaw<Array<{ user_id: string }>>`insert into public.invite_redemptions (user_id, code) values (${auth.user.id}::uuid, ${invite.code}) on conflict (user_id) do nothing returning user_id::text as user_id`;
  if (fresh.length > 0) await prisma.$executeRaw`update public.invites set use_count = use_count + 1 where code = ${invite.code}`;

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('display_name')
    .eq('id', invite.inviter_id)
    .maybeSingle();

  return apiSuccess({ following: true, friendName: profile?.display_name ?? 'Your friend' });
}
