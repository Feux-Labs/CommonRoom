import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);
  if (!isAuthenticatedRequest(authResult)) return authResult;
  const accountError = requireRegisteredUser(authResult);
  if (accountError) return accountError;

  const { supabase, user } = authResult;
  const { data: existing, error: readError } = await supabase
    .from('marketplace_saved')
    .select('listing_id')
    .eq('user_id', user.id)
    .eq('listing_id', id)
    .maybeSingle();
  if (readError) return apiError('marketplace_save_failed', 'This listing could not be updated.', 500);

  if (existing) {
    const { error } = await supabase
      .from('marketplace_saved')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', id);
    if (error) return apiError('marketplace_save_failed', 'This listing could not be unsaved.', 500);
    return apiSuccess({ saved: false });
  }

  const { error } = await supabase
    .from('marketplace_saved')
    .insert({ user_id: user.id, listing_id: id });
  if (error) return apiError('marketplace_save_failed', 'This listing could not be saved.', 500);
  return apiSuccess({ saved: true });
}
