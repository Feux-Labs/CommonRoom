import { apiSuccess } from '@/lib/supabase-server';
import { anonymousRpcError, authenticateAnonymousRequest } from '@/lib/anonymous-api';

/** GET /api/v1/anonymous/identity/recovery-code: whether your Anonymous ID has a recovery code yet. */
export async function GET(request: Request) {
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('anonymous_recovery_status');
  if (error) return anonymousRpcError(error, 'Your recovery code status could not be loaded.');
  return apiSuccess({ hasCode: data === true });
}

/** POST /api/v1/anonymous/identity/recovery-code: make a new recovery code for your ID (the old one stops working). Shown once. */
export async function POST(request: Request) {
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('issue_anonymous_recovery_code');
  if (error) return anonymousRpcError(error, 'Your recovery code could not be made.');
  return apiSuccess({ code: data as string }, 201);
}
