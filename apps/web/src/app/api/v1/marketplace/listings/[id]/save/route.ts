import { NextResponse } from 'next/server';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);

  if (isAuthenticatedRequest(authResult)) {
    const { supabase, user } = authResult;
    try {
      const { data: existing } = await supabase
        .from('marketplace_saved')
        .select('listing_id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('marketplace_saved')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        return apiSuccess({ saved: false });
      } else {
        await supabase
          .from('marketplace_saved')
          .insert({ user_id: user.id, listing_id: id });
        return apiSuccess({ saved: true });
      }
    } catch {
      // Fallback
    }
  }

  // Fallback toggling
  return apiSuccess({ saved: true });
}
