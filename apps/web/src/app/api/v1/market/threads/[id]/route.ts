import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { marketChatError, UUID_PATTERN } from '@/lib/market-chat';

const PAGE = 50;

/**
 * GET /api/v1/market/threads/<id>?before=<iso time>: the conversation header plus its messages (newest 50, or the
 * 50 before `before`), oldest first. Opening it also marks it as read for you.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return apiError('thread_not_found', 'That conversation could not be found.', 404);
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const before = new URL(request.url).searchParams.get('before');
  if (before !== null && Number.isNaN(Date.parse(before))) return apiError('invalid_cursor', 'Invalid page marker.', 400);

  const header = await auth.supabase.rpc('get_market_thread', { p_thread_id: id });
  if (header.error) return marketChatError(header.error, 'The conversation could not be loaded.');
  const thread = (header.data as Array<Record<string, unknown>> | null)?.[0];
  if (!thread) return apiError('thread_not_found', 'That conversation could not be found.', 404);

  let query = auth.supabase.from('market_messages').select('id, sender_id, body, created_at').eq('thread_id', id).order('created_at', { ascending: false }).limit(PAGE + 1);
  if (before) query = query.lt('created_at', before);
  const messages = await query;
  if (messages.error) return marketChatError(messages.error, 'The messages could not be loaded.');

  const rows = messages.data ?? [];
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).reverse();

  if (!before) void auth.supabase.rpc('mark_market_thread_read', { p_thread_id: id }).then(() => undefined, () => undefined);

  return apiSuccess({
    thread,
    me: auth.user.id,
    messages: page.map((row) => ({ id: row.id, mine: row.sender_id === auth.user.id, body: row.body, createdAt: row.created_at })),
    hasMore,
  });
}
