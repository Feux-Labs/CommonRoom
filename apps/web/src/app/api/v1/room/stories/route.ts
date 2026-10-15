import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { attachRoomViewerFields, mapRoomPost } from '@/lib/room-map';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: follows } = await auth.supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', auth.user.id);
  const authorIds = [auth.user.id, ...((follows ?? []).map((row) => row.following_id))];

  const { data, error } = await auth.supabase
    .from('posts')
    .select('id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at')
    .in('author_id', authorIds)
    .in('media_type', ['photo', 'video'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) return apiError('stories_failed', 'Stories could not be loaded.', 500);

  const { data: profiles } = await auth.supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', authorIds);
  const avatars = new Map((profiles ?? []).map((row) => [row.id, row.avatar_url as string | null]));

  const rows = await attachRoomViewerFields(
    auth.supabase,
    auth.user.id,
    (data ?? []).map((row) => ({ ...(row as unknown as Record<string, unknown>), author_avatar: avatars.get(row.author_id) })),
  );
  const grouped = new Map<string, ReturnType<typeof mapRoomPost>[]>();
  for (const row of rows) {
    const post = mapRoomPost(row);
    const authorId = String(row.author_id);
    const list = grouped.get(authorId) ?? [];
    list.push(post);
    grouped.set(authorId, list);
  }

  const stories = [...grouped.entries()].map(([authorId, items]) => ({
    authorId,
    authorName: items[0]?.authorName ?? 'Student',
    authorUsername: items[0]?.authorUsername ?? 'student',
    authorAvatar: avatars.get(authorId) ?? null,
    seen: false,
    items,
  }));

  stories.sort((a, b) => {
    if (a.authorId === auth.user.id) return -1;
    if (b.authorId === auth.user.id) return 1;
    return (b.items[0]?.createdAt ?? '').localeCompare(a.items[0]?.createdAt ?? '');
  });

  return apiSuccess(stories);
}
