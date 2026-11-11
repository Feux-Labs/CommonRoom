import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { communityError, mapCommunity, type CommunityRow } from '@/lib/communities';

type Context = { params: Promise<{ slug: string }> };

async function load(request: Request, slug: string) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return { response: auth } as const;
  const { data, error } = await auth.supabase.rpc('get_community', { p_slug: slug });
  if (error) return { response: communityError(error, 'This community could not be loaded.') } as const;
  const row = ((data ?? []) as CommunityRow[])[0];
  if (!row) return { response: apiError('community_not_found', 'That community could not be found.', 404) } as const;
  return { auth, row } as const;
}

/** GET /api/v1/communities/[slug] */
export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  const loaded = await load(request, slug);
  if ('response' in loaded) return loaded.response;
  return apiSuccess(mapCommunity(loaded.row));
}

/** DELETE /api/v1/communities/[slug]: the owner deletes their community. Its posts stay in Room as ordinary posts. */
export async function DELETE(request: Request, { params }: Context) {
  const { slug } = await params;
  const loaded = await load(request, slug);
  if ('response' in loaded) return loaded.response;
  const { data, error } = await loaded.auth.supabase.rpc('delete_community', { p_community_id: loaded.row.id });
  if (error) return communityError(error, 'This community could not be deleted.');
  if (data !== true) return apiError('forbidden', 'Only the person who started a community can delete it.', 403);
  return apiSuccess({ deleted: true });
}
