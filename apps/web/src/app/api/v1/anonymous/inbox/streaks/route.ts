import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

type Row = { thread_id: string; streak: number; today_done: boolean; you_sent_today: boolean };

/**
 * GET /api/v1/anonymous/inbox/streaks: your chat streaks, one per conversation that has one. A streak is the number of days in a row
 * on which both people sent a message. Nothing about who the other person is.
 */
export async function GET(request: Request) {
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_chat_streaks');
  if (error) return anonymousRpcError(error, 'Your streaks could not be loaded.');
  return apiSuccess(((data ?? []) as Row[]).map((row) => ({ threadId: row.thread_id, streak: row.streak, todayDone: row.today_done, youSentToday: row.you_sent_today })));
}
