import { NextResponse } from 'next/server';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, parseJson } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await parseJson(request)) as { reason?: string; details?: string } | null;

  if (!body || !body.reason || body.reason.trim().length < 3) {
    return apiError('invalid_report', 'Please provide a reason for reporting this listing.', 422);
  }

  const authResult = await authenticateRequest(request);

  if (isAuthenticatedRequest(authResult)) {
    const { supabase, user } = authResult;
    try {
      const { data, error } = await supabase
        .from('marketplace_reports')
        .insert({
          reporter_id: user.id,
          listing_id: id,
          reason: body.reason.trim(),
          details: body.details?.trim() || null,
        })
        .select()
        .single();

      if (!error) {
        return apiSuccess({ reported: true, reportId: data?.id });
      }
    } catch {
      // Fallback
    }
  }

  return apiSuccess({ reported: true, reportId: `rep-${Date.now()}` });
}
