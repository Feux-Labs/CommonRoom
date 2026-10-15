import { apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.targetKind !== 'string' || typeof body.targetId !== 'string' || typeof body.reason !== 'string') {
    return anonymousInvalidBody('Choose content and a reason to report it.');
  }
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('report_anonymous_content', {
    p_target_kind: body.targetKind,
    p_target_id: body.targetId,
    p_reason: body.reason,
  });
  if (error) return anonymousRpcError(error, 'Your report could not be submitted.');
  return apiSuccess({ reported: data === true }, 201);
}
