import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await parseJson(request)) as { reason?: string; details?: string } | null;

  if (!body || !body.reason || body.reason.trim().length < 3) {
    return apiError('invalid_report', 'Please provide a reason for reporting this listing.', 422);
  }

  const authResult = await authenticateRequest(request);
  if (!isAuthenticatedRequest(authResult)) return authResult;
  const accountError = requireRegisteredUser(authResult);
  if (accountError) return accountError;

  const { data, error } = await authResult.supabase
    .from('marketplace_reports')
    .insert({
      reporter_id: authResult.user.id,
      listing_id: id,
      reason: body.reason.trim(),
      details: body.details?.trim() || null,
    })
    .select()
    .single();
  if (error) return apiError('marketplace_report_failed', 'This listing could not be reported.', 500);
  return apiSuccess({ reported: true, reportId: data?.id });
}
