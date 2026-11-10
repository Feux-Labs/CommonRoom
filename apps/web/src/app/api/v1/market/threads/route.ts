import { apiSuccess, apiError, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { marketChatError, UUID_PATTERN } from '@/lib/market-chat';

/** GET /api/v1/market/threads: my marketplace conversations, newest first. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data, error } = await auth.supabase.rpc('list_my_market_threads');
  if (error) return marketChatError(error, 'Your messages could not be loaded.');
  return apiSuccess(data ?? []);
}

/** POST /api/v1/market/threads { listingId }: start (or reopen) a conversation about a listing. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.listingId !== 'string' || !UUID_PATTERN.test(body.listingId)) {
    return apiError('invalid_body', 'Choose a listing to message about.', 400);
  }
  const { data, error } = await auth.supabase.rpc('start_market_thread', { p_listing_id: body.listingId });
  if (error) return marketChatError(error, 'The conversation could not be started.');
  return apiSuccess({ id: data as string });
}
