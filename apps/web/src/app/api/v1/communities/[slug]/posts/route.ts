import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { attachRoomViewerFields, mapRoomPost } from '@/lib/room-map';
import { communityError, type CommunityRow } from '@/lib/communities';

const feedSelect = 'id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at, post_likes(count), post_comments(count)';

/** GET /api/v1/communities/[slug]/posts: the newest posts in this community (public posts only). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data: found, error: findError } = await auth.supabase.rpc('get_community', { p_slug: slug });
  if (findError) return communityError(findError, 'This community could not be loaded.');
  const row = ((found ?? []) as CommunityRow[])[0];
  if (!row) return apiError('community_not_found', 'That community could not be found.', 404);

  const { data, error } = await auth.supabase.from('posts').select(feedSelect)
    .eq('community_id', row.id).eq('audience', 'Public')
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30);
  if (error) return apiError('community_posts_failed', 'Posts could not be loaded.', 500);
  const rows = await attachRoomViewerFields(auth.supabase, auth.user.id, (data ?? []) as unknown as Record<string, unknown>[]);
  return apiSuccess(rows.map(mapRoomPost));
}
