import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

/** GET /api/v1/age-confirmation: has this visitor (guest or signed in) confirmed they are 18+ and accepted the terms? */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { data, error } = await auth.supabase.rpc('is_age_confirmed');
  if (error) return apiError('age_check_failed', 'We could not check that. Try again.', 500);
  return apiSuccess({ confirmed: data === true });
}

/** POST /api/v1/age-confirmation: "I am 18 or older and I agree to the Terms and Community Guidelines". Saved for good. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const { error } = await auth.supabase.rpc('confirm_age_and_terms');
  if (error) return apiError('age_confirm_failed', 'We could not save that. Try again.', 500);
  return apiSuccess({ confirmed: true }, 201);
}
