import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';
import { attachRoomViewerFields, mapRoomPost } from '@/lib/room-map';

type RouteContext = { params: Promise<{ id: string }> };

const feedSelect = 'id, author_id, author_name, author_username, school_label, caption, poll_options, media_items, media_type, location, audience, age_restricted, allow_comments, allow_reuse, created_at, post_likes(count), post_comments(count)';

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;
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
