import { apiError, apiSuccess, authenticateRequest, createPublicSupabase, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';
import { attachRoomViewerFields, mapRoomPost } from '@/lib/room-map';
import { scheduleTextScan } from '@/lib/moderation/media-scan';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

const feedSelect = 'id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at, post_likes(count), post_comments(count)';

export async function GET(request: Request, { params }: RouteContext) {
  const auth = request.headers.has('authorization') ? await authenticateRequest(request) : null;
  if (auth && !isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;
  if (!auth || auth.user.is_anonymous) {
    const { data, error } = await createPublicSupabase().rpc('get_public_room_feed_page', {
      p_before_created_at: null,
      p_before_id: null,
      p_limit: 1,
      p_post_id: id,
    });
    if (error) return apiError('post_read_failed', 'This post could not be loaded.', 500);
    const post = (data as Record<string, unknown>[] | null)?.[0];
    return post ? apiSuccess(mapRoomPost(post)) : apiError('post_not_found', 'This post is unavailable.', 404);
  }
  const { data, error } = await auth.supabase.from('posts').select(feedSelect).eq('id', id).maybeSingle();
  if (error) return apiError('post_read_failed', 'This post could not be loaded.', 500);
  if (!data) return apiError('post_not_found', 'This post is unavailable.', 404);

  const [row] = await attachRoomViewerFields(auth.supabase, auth.user.id, [data as unknown as Record<string, unknown>]);
  return apiSuccess(mapRoomPost(row));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const caption = typeof body?.caption === 'string' ? body.caption.trim() : undefined;
  const location = typeof body?.location === 'string' ? body.location.trim() : undefined;

  if (caption !== undefined && caption.length > 2200) return apiError('invalid_caption', 'Keep your post to 2,200 characters.', 422);

  // Only the author can edit, and not once the post has been reported or flagged by the automatic checks:
  // from then on a moderator decides. The same lookup answers "is it yours" so nobody can probe other people's posts.
  const state = await prisma.$queryRaw<Array<{ mine: boolean; locked: boolean }>>`
    select
      exists (select 1 from public.posts p where p.id = ${id}::uuid and p.author_id = ${auth.user.id}::uuid) as mine,
      (exists (select 1 from public.post_reports r where r.post_id = ${id}::uuid)
        or exists (select 1 from public.auto_flags f where f.target_kind = 'room_post' and f.target_id = ${id}::uuid and f.status = 'open')) as locked`.catch(() => null);
  if (!state) return apiError('post_update_failed', 'This post could not be updated.', 500);
  if (!state[0]?.mine) return apiError('post_not_found', 'This post could not be found or you do not have permission to edit it.', 404);
  if (state[0].locked) return apiError('post_locked', 'This post has been reported or is being reviewed, so it can’t be edited now.', 409);

  const updates: Record<string, unknown> = {};
  if (caption !== undefined) updates.caption = caption;
  if (location !== undefined) updates.location = location;

  const { data, error } = await auth.supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .eq('author_id', auth.user.id)
    .select(feedSelect)
    .maybeSingle();

  if (error) return apiError('post_update_failed', 'This post could not be updated.', 500);
  if (!data) return apiError('post_not_found', 'This post could not be found or you do not have permission to edit it.', 404);

  if (caption) scheduleTextScan('room_post', id, caption);
  const [row] = await attachRoomViewerFields(auth.supabase, auth.user.id, [data as unknown as Record<string, unknown>]);
  return apiSuccess(mapRoomPost(row));
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const { id } = await params;
  const { error } = await auth.supabase.from('posts').delete().eq('id', id).eq('author_id', auth.user.id);
  if (error) return apiError('post_delete_failed', 'This post could not be removed.', 500);
  return apiSuccess({ deleted: true });
}
