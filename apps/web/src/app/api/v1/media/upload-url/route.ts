import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';
import { mediaUrlFor } from '@/lib/media-url';
import { requireAdult } from '@/lib/anonymous-api';
import { presignUpload, R2NotConfiguredError } from '@/lib/r2';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};
const MAX_IMAGE_BYTES = 6_000_000;
const MAX_VIDEO_BYTES = 2_500_000;
const PREFIXES = ['', 'profile-', 'listing-'];

/**
 * POST /api/v1/media/upload-url { contentType, size, kind?: 'user' | 'anonymous', prefix? }
 * Returns a short-lived signed URL the browser uploads to directly (PUT), plus the stored path and public URL.
 * 'anonymous' uploads get an opaque path that carries no user id.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const limited = await rateLimit(auth.supabase, 'media_upload_url', 120, 3600);
  if (limited) return limited;

  const body = await parseJson(request);
  // Anonymous uploads are part of posting, so they need the 18+ confirmation too.
  if (isRecord(body) && body.kind === 'anonymous') {
    const refused = await requireAdult(auth.supabase);
    if (refused) return refused;
  }
  if (!isRecord(body) || typeof body.contentType !== 'string' || typeof body.size !== 'number') {
    return apiError('invalid_body', 'Choose a photo or video to upload.', 400);
  }
  const extension = EXTENSIONS[body.contentType];
  if (!extension) return apiError('unsupported_media', 'Use a JPG, PNG, WebP, MP4, MOV or WebM file.', 422);
  const isVideo = body.contentType.startsWith('video/');
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number.isInteger(body.size) || body.size <= 0 || body.size > limit) {
    return apiError('media_too_large', isVideo ? 'Videos can be up to 2.5 MB after compression.' : 'Photos can be up to 6 MB.', 422);
  }

  let path: string;
  if (body.kind === 'anonymous') {
    const { data, error } = await auth.supabase.rpc('register_anonymous_media_upload', { p_extension: extension });
    if (error) {
      if ((error.message ?? '').includes('anonymous_rate_limit_exceeded')) return apiError('rate_limited', 'You’re uploading too often. Try again later.', 429);
      console.error('Anonymous media upload could not be registered.', { code: error.code ?? 'unknown' });
      return apiError('upload_unavailable', 'The upload could not be prepared. Try again.', 500);
    }
    if (typeof data !== 'string') return apiError('upload_unavailable', 'The upload could not be prepared. Try again.', 500);
    path = data;
  } else {
    const prefix = body.prefix === undefined ? '' : body.prefix;
    if (typeof prefix !== 'string' || !PREFIXES.includes(prefix)) return apiError('invalid_body', 'Invalid upload type.', 400);
    path = `${auth.user.id}/${prefix}${crypto.randomUUID()}.${extension}`;
  }

  try {
    const uploadUrl = await presignUpload(path, body.contentType, body.size);
    const url = mediaUrlFor(path);
    if (!url) throw new R2NotConfiguredError();
    return apiSuccess({ path, url, uploadUrl }, 201);
  } catch (error) {
    if (error instanceof R2NotConfiguredError) return apiError('storage_not_configured', 'Media uploads are not set up yet.', 503);
    console.error('Media upload URL could not be created.', error instanceof Error ? error.message : 'unknown');
    return apiError('upload_unavailable', 'The upload could not be prepared. Try again.', 500);
  }
}
