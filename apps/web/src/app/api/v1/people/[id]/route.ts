import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { attachRoomViewerFields, mapRoomPost } from '@/lib/room-map';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;

  const { data: profile, error } = await auth.supabase
    .from('profiles')
    .select('id, display_name, username, school, bio, avatar_url, show_school_on_profile, interests')
    .eq('id', id)
    .maybeSingle();
  if (error) return apiError('profile_read_failed', 'This profile could not be loaded.', 500);
  if (!profile) return apiError('profile_not_found', 'This profile is unavailable.', 404);

  const [{ data: follow }, { count: followerCount }, { data: posts }] = await Promise.all([
    auth.supabase.from('follows').select('following_id').eq('follower_id', auth.user.id).eq('following_id', id).maybeSingle(),
    auth.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
    auth.supabase
      .from('posts')
      .select('id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at, post_likes(count), post_comments(count), post_saves(count)')
      .eq('author_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return apiSuccess({
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    school: profile.show_school_on_profile ? profile.school : null,
    bio: profile.bio ?? '',
    avatar_url: profile.avatar_url,
    following: Boolean(follow),
    follower_count: followerCount ?? 0,
    interests: profile.interests ?? [],
    posts: (await attachRoomViewerFields(
      auth.supabase,
      auth.user.id,
      (posts ?? []).map((row) => ({ ...(row as unknown as Record<string, unknown>), author_avatar: profile.avatar_url })),
    )).map(mapRoomPost),
  });
}
