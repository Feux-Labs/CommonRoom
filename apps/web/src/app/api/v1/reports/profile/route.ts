import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { contentReportError } from '@/lib/content-reports';
import { UUID_PATTERN } from '@/lib/market-chat';

/** POST /api/v1/reports/profile { userId, reason }: report someone's profile. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || !UUID_PATTERN.test(body.userId) || typeof body.reason !== 'string') {
    return apiError('invalid_body', 'Choose a person and a reason.', 400);
  }
  const { error } = await auth.supabase.rpc('report_profile', { p_user_id: body.userId, p_reason: body.reason });
  if (error) return contentReportError(error, 'Your report could not be sent.');
  return apiSuccess({ reported: true }, 201);
}
