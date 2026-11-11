import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { communityError, type CommunityRow } from '@/lib/communities';

type Context = { params: Promise<{ slug: string }> };

async function act(request: Request, slug: string, fn: 'join_community' | 'leave_community') {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  if (auth.user.is_anonymous) return apiError('account_required', 'Create an account to join communities.', 403);
  const { data: found, error: findError } = await auth.supabase.rpc('get_community', { p_slug: slug });
  if (findError) return communityError(findError, 'This community could not be loaded.');
  const row = ((found ?? []) as CommunityRow[])[0];
  if (!row) return apiError('community_not_found', 'That community could not be found.', 404);
  const { error } = await auth.supabase.rpc(fn, { p_community_id: row.id });
  if (error) return communityError(error, 'That did not work. Try again.');
  return apiSuccess({ joined: fn === 'join_community' });
}

/** POST /api/v1/communities/[slug]/members: join */
export async function POST(request: Request, { params }: Context) {
  return act(request, (await params).slug, 'join_community');
}

/** DELETE /api/v1/communities/[slug]/members: leave */
export async function DELETE(request: Request, { params }: Context) {
  return act(request, (await params).slug, 'leave_community');
}
