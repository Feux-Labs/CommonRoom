import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';
import { scheduleTextScan } from '@/lib/moderation/media-scan';
import { rejectUnsafeAnonymousText } from '@/lib/text-filter';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH /api/v1/anonymous/posts/[id] { body }: the author edits the text of their own post. Checked again like a new post. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!uuid.test(id) || !body || typeof body.body !== 'string' || body.body.trim().length < 1 || body.body.length > 3000) {
    return anonymousInvalidBody('Write the new text of your post (up to 3,000 characters).');
  }
  const unsafe = rejectUnsafeAnonymousText(body.body);
  if (unsafe) return unsafe;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('edit_anonymous_post', { p_post_id: id, p_body: body.body });
  if (error) return anonymousRpcError(error, 'Your post could not be edited.');
  if (!data) return apiSuccess({ edited: false }, 404);
  scheduleTextScan('post', id, body.body);
  return apiSuccess({ edited: true, body: body.body.trim() });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('delete_anonymous_post', { p_post_id: id });
  if (error) return anonymousRpcError(error, 'Your post could not be deleted.');
  if (!data) return apiSuccess({ deleted: false }, 404);
  return apiSuccess({ deleted: true });
}
