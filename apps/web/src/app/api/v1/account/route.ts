import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { deleteObjects, deletePrefix, R2NotConfiguredError } from '@/lib/r2';
import { purgeUrls } from '@/lib/cdn';
import { mediaUrlFor } from '@/lib/media-url';

/**
 * DELETE /api/v1/account { confirm: "DELETE" }: permanently deletes the signed-in account and everything it made.
 * Posts, comments, listings, messages and profile go with the account (database cascades). Uploaded files are
 * removed from storage too. Works even while the account is paused or banned.
 */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || body.confirm !== 'DELETE') {
    return apiError('confirmation_required', 'Type DELETE to confirm.', 400);
  }
  const userId = auth.user.id;

  try {
    // Files that are not under the user's own folder: anonymous uploads and media on anonymous posts.
    const anonymousFiles = await prisma.$queryRaw<Array<{ path: string }>>`
      select object_path as path from public.anonymous_media_uploads where owner_id = ${userId}::uuid
      union
      select item->>'path' as path
      from public.anonymous_posts post, jsonb_array_elements(post.media_items) item
      where post.author_id = ${userId}::uuid and item->>'path' is not null`;

    try {
      const ownKeys = await deletePrefix(`${userId}/`);
      const anonymousKeys = anonymousFiles.map((row) => row.path).filter((path) => path.startsWith('anonymous/'));
      await deleteObjects(anonymousKeys);
      await purgeUrls([...ownKeys, ...anonymousKeys].map((key) => mediaUrlFor(key)));
    } catch (storageError) {
      if (!(storageError instanceof R2NotConfiguredError)) {
        console.error('Account files could not be fully removed.', storageError instanceof Error ? storageError.message : 'unknown');
      }
    }

    await prisma.$executeRaw`delete from auth.users where id = ${userId}::uuid`;
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Account deletion failed.', error instanceof Error ? error.message.split('\n')[0] : 'unknown');
    return apiError('delete_failed', 'We could not delete your account. Try again or contact support.', 500);
  }
}
