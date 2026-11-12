import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { verifyRelayTicket } from '@/lib/upload-relay';
import { presignUpload, R2NotConfiguredError } from '@/lib/r2';

/**
 * PUT /api/v1/media/relay?ticket=...: the fallback path for uploads. The body is the file. The ticket (from upload-url) says
 * exactly which file this person may write; anything that does not match it is refused.
 */
export async function PUT(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const ticket = new URL(request.url).searchParams.get('ticket') ?? '';
  let claims;
  try { claims = verifyRelayTicket(ticket, auth.user.id); } catch { return apiError('storage_not_configured', 'Media uploads are not set up yet.', 503); }
  if (!claims) return apiError('invalid_ticket', 'This upload link expired. Choose the file again.', 403);

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType !== claims.t) return apiError('invalid_media', 'The file type did not match.', 422);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length !== claims.s) return apiError('invalid_media', 'The file size did not match.', 422);

  try {
    const target = await presignUpload(claims.p, claims.t, claims.s);
    const stored = await fetch(target, { method: 'PUT', headers: { 'Content-Type': claims.t }, body: bytes });
    if (!stored.ok) return apiError('upload_failed', 'The upload could not be stored. Try again.', 502);
    return apiSuccess({ stored: true });
  } catch (error) {
    if (error instanceof R2NotConfiguredError) return apiError('storage_not_configured', 'Media uploads are not set up yet.', 503);
    return apiError('upload_failed', 'The upload could not be stored. Try again.', 502);
  }
}
