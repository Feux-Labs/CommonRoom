import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { deleteObjects, R2NotConfiguredError } from '@/lib/r2';
import { purgeUrls } from '@/lib/cdn';
import { mediaUrlFor } from '@/lib/media-url';

const SAFE_PATH = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/;

/**
 * DELETE /api/v1/media { paths: string[] }: cleans up uploads from a post that failed to publish.
 * You can delete files in your own folder, and your own anonymous uploads that no post uses yet.
 */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || !Array.isArray(body.paths) || body.paths.length > 20
    || body.paths.some((path) => typeof path !== 'string' || path.length > 200 || !SAFE_PATH.test(path) || path.includes('..'))) {
    return apiError('invalid_body', 'Send the files to remove.', 400);
  }
  const paths = body.paths as string[];

  const own = paths.filter((path) => path.startsWith(`${auth.user.id}/`));
  const anonymous = paths.filter((path) => path.startsWith('anonymous/'));
  if (own.length + anonymous.length !== paths.length) return apiError('forbidden', 'You can only remove your own uploads.', 403);

  let allowed = [...own];
  if (anonymous.length) {
    // Row security only shows the caller's own upload records.
    const { data, error } = await auth.supabase
      .from('anonymous_media_uploads')
      .select('object_path')
      .in('object_path', anonymous)
      .is('attached_post_id', null);
    if (error) return apiError('cleanup_failed', 'The files could not be removed.', 500);
    allowed = allowed.concat((data ?? []).map((row: { object_path: string }) => row.object_path));
  }

  try {
    await deleteObjects(allowed);
    await purgeUrls(allowed.map((key) => mediaUrlFor(key)));
    return apiSuccess({ removed: allowed.length });
  } catch (error) {
    if (error instanceof R2NotConfiguredError) return apiError('storage_not_configured', 'Media uploads are not set up yet.', 503);
    console.error('Media cleanup failed.', error instanceof Error ? error.message : 'unknown');
    return apiError('cleanup_failed', 'The files could not be removed.', 500);
  }
}
