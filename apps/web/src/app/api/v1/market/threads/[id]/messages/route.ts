import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { marketChatError, UUID_PATTERN } from '@/lib/market-chat';
import { scheduleTextScan } from '@/lib/moderation/media-scan';

/** POST /api/v1/market/threads/<id>/messages { body }: send a message in a conversation you are part of. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return apiError('thread_not_found', 'That conversation could not be found.', 404);
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.body !== 'string') return apiError('invalid_body', 'Write a message.', 400);

  const { data, error } = await auth.supabase.rpc('send_market_message', { p_thread_id: id, p_body: body.body });
  if (error) return marketChatError(error, 'Your message could not be sent.');
  const row = (data as Array<{ id: string; body: string; created_at: string }> | null)?.[0];
  if (!row) return apiError('market_chat_failed', 'Your message could not be sent.', 500);
  scheduleTextScan('market_message', row.id, row.body);
  return apiSuccess({ id: row.id, mine: true, body: row.body, createdAt: row.created_at }, 201);
}
