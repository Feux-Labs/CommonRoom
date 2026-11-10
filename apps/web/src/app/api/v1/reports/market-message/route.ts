import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { contentReportError } from '@/lib/content-reports';
import { UUID_PATTERN } from '@/lib/market-chat';

/** POST /api/v1/reports/market-message { messageId, reason }: report a message the other person sent you. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.messageId !== 'string' || !UUID_PATTERN.test(body.messageId) || typeof body.reason !== 'string') {
    return apiError('invalid_body', 'Choose a message and a reason.', 400);
  }
  const { error } = await auth.supabase.rpc('report_market_message', { p_message_id: body.messageId, p_reason: body.reason });
  if (error) return contentReportError(error, 'Your report could not be sent.');
  return apiSuccess({ reported: true }, 201);
}
