import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

const allowedExtensions = ['jpg', 'png', 'webp', 'mp4', 'mov', 'webm'];

export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.extension !== 'string' || !allowedExtensions.includes(body.extension)) {
    return anonymousInvalidBody('Choose a supported image or video file.');
  }

  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('register_anonymous_media_upload', {
    p_extension: body.extension,
  });
  if (error) return anonymousRpcError(error, 'An anonymous media upload could not be prepared.');
  if (typeof data !== 'string') {
    return anonymousRpcError({ code: 'invalid_upload_path', message: 'The anonymous media upload path was invalid.' }, 'An anonymous media upload could not be prepared.');
  }
  return apiSuccess({ path: data }, 201);
}
