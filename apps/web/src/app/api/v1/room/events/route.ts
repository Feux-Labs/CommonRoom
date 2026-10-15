import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

const types = new Set(['impression', 'open', 'watch_complete', 'like', 'comment', 'share', 'save', 'skip', 'send']);

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.eventType !== 'string' || !types.has(body.eventType)) {
    return apiError('invalid_event', 'Send a supported Room event.', 422);
  }

  const { error } = await auth.supabase.from('room_events').insert({
    user_id: auth.user.id,
    post_id: typeof body.postId === 'string' ? body.postId : null,
    event_type: body.eventType,
  });
  if (error) return apiError('event_failed', 'This action could not be recorded.', 500);
  return apiSuccess({ recorded: true }, 201);
}
