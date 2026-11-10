import { parseListingFields } from '@/lib/listing-validation';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import { INITIAL_MARKETPLACE_LISTINGS } from '@/lib/marketplace-seed';
import type { MarketplaceListing } from '@/lib/marketplace-contracts';

// In Next.js 15/16 App Router, params is a Promise
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);
  const userId = isAuthenticatedRequest(authResult) ? authResult.user.id : null;
  const canContactSeller = isAuthenticatedRequest(authResult) && !authResult.user.is_anonymous;

  if (isAuthenticatedRequest(authResult)) {
    try {
      const { supabase } = authResult;
      const { data: dbItem, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          seller:profiles!seller_id(display_name, username, school)
        `)
        .eq('id', id)
        .single();

      if (!error && dbItem) {
        // Increment views in background
        void supabase
          .from('marketplace_listings')
          .update({ views_count: (dbItem.views_count || 0) + 1 })
          .eq('id', id);

        let isSaved = false;
        if (userId) {
          const { data: savedRow } = await supabase
            .from('marketplace_saved')
            .select('listing_id')
            .eq('user_id', userId)
            .eq('listing_id', id)
            .maybeSingle();
          isSaved = Boolean(savedRow);
        }

        const listing: MarketplaceListing = {
          id: dbItem.id,
          seller_id: dbItem.seller_id,
          seller_name: dbItem.seller?.display_name || 'Campus Student',
          seller_username: dbItem.seller?.username || null,
          seller_avatar: null,
          seller_school: dbItem.seller?.school || dbItem.school || null,
          seller_phone: canContactSeller ? dbItem.contact_phone || null : null,
          title: dbItem.title,
          description: dbItem.description,
          price: Number(dbItem.price),
          category: dbItem.category,
          condition: dbItem.condition,
          location: dbItem.location,
          school: dbItem.school,
          images: Array.isArray(dbItem.images) ? dbItem.images : [],
          images_sensitive: dbItem.images_sensitive === true,
          status: dbItem.status,
          likes_count: 0,
          views_count: (dbItem.views_count || 0) + 1,
          is_saved: isSaved,
          is_mine: userId === dbItem.seller_id,
          created_at: dbItem.created_at,
          updated_at: dbItem.updated_at,
        };

        return apiSuccess(listing);
      }
    } catch {
      // Fallback
    }
  }

  const found = INITIAL_MARKETPLACE_LISTINGS.find((item) => item.id === id);
  if (!found) {
    return apiError('listing_not_found', 'This marketplace listing could not be found.', 404);
  }

  found.views_count += 1;
  return apiSuccess({
    ...found,
    seller_phone: canContactSeller ? found.seller_phone : null,
    is_mine: userId !== null && found.seller_id === userId,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawBody = await parseJson(request);
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) return apiError('invalid_body', 'Invalid update data.', 400);
  const parsed = parseListingFields(rawBody as Record<string, unknown>, true);
  if (!parsed.ok) return apiError(parsed.code, parsed.message, parsed.status);

  const authResult = await authenticateRequest(request);
  if (!isAuthenticatedRequest(authResult)) return authResult;
  const accountError = requireRegisteredUser(authResult);
  if (accountError) return accountError;
  const { supabase, user } = authResult;
  const { data: existing, error: readError } = await supabase
    .from('marketplace_listings')
    .select('seller_id, status')
    .eq('id', id)
    .maybeSingle();
  if (readError) return apiError('listing_update_failed', 'This listing could not be updated.', 500);
  if (!existing) return apiError('listing_not_found', 'This listing could not be found.', 404);
  if (existing.seller_id !== user.id) {
    return apiError('forbidden', 'You can only update your own listings.', 403);
  }
  // Moderators remove listings; sellers must not be able to put them back.
  if (existing.status === 'removed') {
    return apiError('listing_removed', 'This listing was removed by a moderator.', 403);
  }

  const { school: _ignoredSchool, ...changes } = parsed.data;
  void _ignoredSchool;
  const updateData: Record<string, unknown> = {
    ...changes,
    updated_at: new Date().toISOString(),
  };
  const { data: updatedDb, error: updateError } = await supabase
    .from('marketplace_listings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (updateError || !updatedDb) return apiError('listing_update_failed', 'This listing could not be updated.', 500);
  return apiSuccess(updatedDb);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);
  if (!isAuthenticatedRequest(authResult)) return authResult;
  const accountError = requireRegisteredUser(authResult);
  if (accountError) return accountError;
  const { supabase, user } = authResult;
  const { data: existing, error: readError } = await supabase
    .from('marketplace_listings')
    .select('seller_id')
    .eq('id', id)
    .maybeSingle();
  if (readError) return apiError('listing_delete_failed', 'This listing could not be deleted.', 500);
  if (!existing) return apiError('listing_not_found', 'This listing could not be found.', 404);
  if (existing.seller_id !== user.id) {
    return apiError('forbidden', 'You can only delete your own listings.', 403);
  }

  const { error: deleteError } = await supabase.from('marketplace_listings').delete().eq('id', id);
  if (deleteError) return apiError('listing_delete_failed', 'This listing could not be deleted.', 500);
  return apiSuccess({ deleted: true });
}
