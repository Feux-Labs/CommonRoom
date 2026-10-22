import { apiError, apiSuccess, authenticateRequest, createPublicSupabase, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import type { Audience, MediaItem, MediaType } from '@/lib/contracts';
import type { RoomScope } from '@/lib/room-contracts';
import { attachRoomViewerFields, decodeRoomCursor, encodeRoomCursor, mapRoomPost } from '@/lib/room-map';

const feedSelect = 'id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at, post_likes(count), post_comments(count)';
const audiences: Audience[] = ['Public', 'Followers', 'Private'];
const mediaTypes: MediaType[] = ['photo', 'video', 'text', 'question', 'poll'];
const pageSize = 12;

function normalizeScope(value: string | null): RoomScope {
  if (value === 'following') return 'following';
  if (value === 'general' || value === 'school') return 'general';
  return 'for_you';
}

export async function GET(request: Request) {
  const auth = request.headers.has('authorization') ? await authenticateRequest(request) : null;
  if (auth && !isAuthenticatedRequest(auth)) return auth;

  const url = new URL(request.url);
  const scope = normalizeScope(url.searchParams.get('scope') ?? 'for_you');
  const cursor = decodeRoomCursor(url.searchParams.get('cursor'));
  if (cursor === undefined) {
    return apiError('invalid_room_cursor', 'The feed continuation token is invalid. Refresh Room to continue.', 400);
  }
  const parsedLimit = Number(url.searchParams.get('limit') ?? pageSize);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(30, Math.floor(parsedLimit))) : pageSize;

  if (!auth || auth.user.is_anonymous) {
    if (scope === 'following') return apiSuccess({ posts: [], hasMore: false, nextCursor: null });
    const { data, error } = await createPublicSupabase().rpc('get_public_room_feed_page', {
      p_before_created_at: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: limit + 1,
    });
    if (error) return apiError('feed_read_failed', 'The public Room feed could not be loaded.', 500);
    const rows = (data ?? []) as Record<string, unknown>[];
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return apiSuccess({
      posts: page.map(mapRoomPost),
      hasMore,
      nextCursor: hasMore && last ? encodeRoomCursor(String(last.created_at), String(last.id)) : null,
    });
  }

  const { data: rpcData, error: rpcError } = await auth.supabase.rpc('get_room_feed_page', {
    p_scope: scope,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit + 1,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    const hasMore = rpcData.length > limit;
    const rows = rpcData.slice(0, limit) as Record<string, unknown>[];
    const last = rows.at(-1);
    return apiSuccess({
      posts: rows.map(mapRoomPost),
      hasMore,
      nextCursor: hasMore && last ? encodeRoomCursor(String(last.created_at), String(last.id)) : null,
    });
  }

  let query = auth.supabase.from('posts').select(feedSelect).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  if (scope === 'following') {
    const { data: follows, error: followsError } = await auth.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', auth.user.id);
    if (followsError) return apiError('feed_read_failed', 'Your feed could not be loaded.', 500);
    const followingIds = (follows ?? []).map((follow) => follow.following_id);
    if (followingIds.length === 0) return apiSuccess({ posts: [], hasMore: false, nextCursor: null });
    query = query.in('author_id', followingIds);
  } else {
    const { data: profile } = await auth.supabase.from('profiles').select('school').eq('id', auth.user.id).maybeSingle();
    if (scope === 'for_you' && profile?.school) query = query.eq('school_label', profile.school);
    if (scope === 'general' && profile?.school) query = query.or(`school_label.is.null,school_label.neq.${profile.school}`);
  }

  const { data, error } = await query;
  if (error) return apiError('feed_read_failed', 'Your feed could not be loaded.', 500);
  const rows = await attachRoomViewerFields(auth.supabase, auth.user.id, (data ?? []) as Record<string, unknown>[]);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return apiSuccess({
    posts: page.map(mapRoomPost),
    hasMore,
    nextCursor: hasMore && last ? encodeRoomCursor(String(last.created_at), String(last.id)) : null,
  });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;

  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send a valid post object.', 400);

  const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
  const mediaType = body.mediaType;
  const audience = body.audience;
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 120) : null;
  const pollOptions = Array.isArray(body.pollOptions)
    ? body.pollOptions.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
    : [];
  const mediaItems: MediaItem[] = Array.isArray(body.mediaItems)
    ? body.mediaItems.filter((item): item is MediaItem => isRecord(item)
      && typeof item.uri === 'string'
      && (item.mediaType === 'photo' || item.mediaType === 'video'))
    : [];

  if (caption.length > 3000 || (!caption && mediaItems.length === 0)) {
    return apiError('invalid_content', 'Add a caption or media, with a caption no longer than 3,000 characters.', 422);
  }
  if (!mediaTypes.includes(mediaType as MediaType)) {
    return apiError('invalid_media_type', 'Choose a supported post type.', 422);
  }
  if (mediaType === 'poll' && (pollOptions.length < 2 || pollOptions.length > 6 || pollOptions.some((option) => option.length > 100))) {
    return apiError('invalid_poll', 'A poll needs 2 to 6 answer options, each no longer than 100 characters.', 422);
  }
  if (!audiences.includes(audience as Audience)) {
    return apiError('invalid_audience', 'Choose Public, Followers, or Private visibility.', 422);
  }
  if (mediaItems.length > 10 || mediaItems.some((item) => {
    try {
      return new URL(item.uri).protocol !== 'https:' && new URL(item.uri).protocol !== 'http:';
    } catch {
      return true;
    }
  })) {
    return apiError('invalid_media', 'Upload up to 10 media items and use their secure public URLs.', 422);
  }
  if (mediaType === 'video' && (mediaItems.length !== 1 || mediaItems[0]?.mediaType !== 'video')) {
    return apiError('invalid_video', 'A video post must contain exactly one uploaded video.', 422);
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('display_name, username, school, show_school_on_profile, avatar_url')
    .eq('id', auth.user.id)
    .single();
  if (profileError) return apiError('profile_required', 'Finish your profile before creating a post.', 409);

  const username = profile.username || `user_${auth.user.id.slice(0, 8)}`;
  const { data, error } = await auth.supabase
    .from('posts')
    .insert({
      author_id: auth.user.id,
      author_name: profile.display_name,
      author_username: username,
      school_label: profile.show_school_on_profile ? profile.school : null,
      caption,
      poll_options: mediaType === 'poll' ? pollOptions : [],
      media_items: mediaItems,
      media_type: mediaType,
      location,
      audience,
      age_restricted: body.ageRestricted === true,
      allow_comments: body.allowComments !== false,
      allow_reuse: body.allowReuse !== false,
      selected_sound: typeof body.selectedSound === 'string' ? body.selectedSound.slice(0, 100) : null,
    })
    .select(feedSelect)
    .single();

  if (error) return apiError('post_create_failed', 'Your post could not be published.', 500);
  const mapped = mapRoomPost({
    ...(data as unknown as Record<string, unknown>),
    author_avatar: profile.avatar_url,
    liked_by_me: false,
    saved_by_me: false,
  });
  return apiSuccess(mapped, 201);
}
