import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;

  const { data, error } = await auth.supabase
    .from('post_comments')
    .select('id, post_id, body, created_at, author_id, parent_id')
    .eq('post_id', id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return apiError('comments_read_failed', 'Comments could not be loaded.', 500);

  const authorIds = [...new Set((data ?? []).map((row) => row.author_id))];
  const { data: authors } = authorIds.length
    ? await auth.supabase.from('profiles').select('id, display_name, username').in('id', authorIds)
    : { data: [] as { id: string; display_name: string; username: string | null }[] };
  const names = new Map((authors ?? []).map((author) => [author.id, author]));

  return apiSuccess((data ?? []).map((row) => ({
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    author_name: names.get(row.author_id)?.display_name ?? 'Student',
    author_username: names.get(row.author_id)?.username ?? 'student',
    body: row.body,
    parent_id: row.parent_id ?? null,
    created_at: row.created_at,
  })));
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { id } = await params;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.body !== 'string') {
    return apiError('invalid_body', 'Enter a comment.', 400);
  }

  const comment = body.body.trim();
  if (!comment || comment.length > 2000) {
    return apiError('invalid_comment', 'Comments must contain 1 to 2,000 characters.', 422);
  }

  const { data: post } = await auth.supabase.from('posts').select('id, allow_comments').eq('id', id).maybeSingle();
  if (!post) return apiError('post_not_found', 'This post is unavailable.', 404);
  if (post.allow_comments === false) {
    return apiError('comments_closed', 'Comments are turned off for this post.', 422);
  }

  let parentId = typeof body.parentId === 'string' ? body.parentId : null;
  if (parentId) {
    const { data: parent, error: parentError } = await auth.supabase
      .from('post_comments')
      .select('id, post_id, parent_id')
      .eq('id', parentId)
      .maybeSingle();
    if (parentError || !parent || parent.post_id !== id) {
      return apiError('invalid_reply', 'That comment is no longer available to reply to.', 422);
    }
    parentId = parent.parent_id ?? parent.id;
  }
  const insert: Record<string, unknown> = { post_id: id, author_id: auth.user.id, body: comment };
  if (parentId) insert.parent_id = parentId;

  const { data, error } = await auth.supabase
    .from('post_comments')
    .insert(insert)
    .select('id, post_id, body, created_at, author_id, parent_id')
    .single();
  if (error) return apiError('comment_create_failed', 'Your comment could not be posted.', 500);

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', auth.user.id)
    .maybeSingle();

  void auth.supabase.from('room_events').insert({
    user_id: auth.user.id,
    post_id: id,
    event_type: 'comment',
  });

  return apiSuccess({
    id: data.id,
    post_id: data.post_id,
    author_id: data.author_id,
    author_name: profile?.display_name ?? 'You',
    author_username: profile?.username ?? 'student',
    body: data.body,
    parent_id: data.parent_id ?? null,
    created_at: data.created_at,
  }, 201);
}
