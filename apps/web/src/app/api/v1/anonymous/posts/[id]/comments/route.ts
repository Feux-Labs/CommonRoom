import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

const commentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_comments', { p_post_id: id });
  if (error) return anonymousRpcError(error, 'Comments could not be loaded.');
  return apiSuccess(data ?? []);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string'
    || (body.parentCommentId !== undefined && body.parentCommentId !== null
      && (typeof body.parentCommentId !== 'string' || !commentIdPattern.test(body.parentCommentId)))) {
    return anonymousInvalidBody('Add a comment and choose a valid parent comment.');
  }
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('create_anonymous_comment', {
    p_post_id: id,
    p_body: body.body,
    p_parent_comment_id: body.parentCommentId ?? null,
  });
  if (error) return anonymousRpcError(error, 'Your comment could not be posted.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
