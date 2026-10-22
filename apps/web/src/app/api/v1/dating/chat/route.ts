import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send a valid Connect message request.', 400);

  if (typeof body.userId === 'string') {
    if (!uuidPattern.test(body.userId)) return apiError('invalid_user', 'Choose a valid person.', 422);
    const { data: conversationId, error: conversationError } = await auth.supabase.rpc(
      'get_or_create_meet_conversation',
      { p_other_user_id: body.userId },
    );
    if (conversationError) {
      if (conversationError.message.includes('meet_mutual_interest_required')) {
        return apiError('mutual_interest_required', 'You can message each other after you have both shown interest.', 403);
      }
      return apiError('meet_chat_unavailable', 'This conversation could not be opened.', 500);
    }

    const { data: messages, error: messagesError } = await auth.supabase
      .from('direct_messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (messagesError) return apiError('meet_chat_unavailable', 'Messages could not be loaded.', 500);
    return apiSuccess({ conversationId, messages: messages ?? [] });
  }

  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!uuidPattern.test(conversationId) || message.length < 1 || message.length > 4000) {
    return apiError('invalid_message', 'Write a message of 1 to 4,000 characters.', 422);
  }
  const { data, error } = await auth.supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      body: message,
    })
    .select('id, sender_id, body, created_at')
    .single();
  if (error) return apiError('message_send_failed', 'Your message could not be sent.', 500);
  return apiSuccess(data, 201);
}
