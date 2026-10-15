import { NextResponse } from 'next/server';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, parseJson } from '@/lib/supabase-server';
import { INITIAL_MARKETPLACE_LISTINGS } from '@/lib/marketplace-seed';
import type { MarketplaceListing, UpdateListingInput } from '@/lib/marketplace-contracts';

// In Next.js 15/16 App Router, params is a Promise
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);
  const userId = isAuthenticatedRequest(authResult) ? authResult.user.id : null;

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
          seller_phone: dbItem.contact_phone || null,
          title: dbItem.title,
          description: dbItem.description,
          price: Number(dbItem.price),
          category: dbItem.category,
          condition: dbItem.condition,
          location: dbItem.location,
          school: dbItem.school,
          images: Array.isArray(dbItem.images) ? dbItem.images : [],
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
    is_mine: userId !== null && found.seller_id === userId,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await parseJson(request)) as UpdateListingInput | null;
  if (!body) return apiError('invalid_body', 'Invalid update data.', 400);

  const authResult = await authenticateRequest(request);
  const userId = isAuthenticatedRequest(authResult) ? authResult.user.id : null;

  if (isAuthenticatedRequest(authResult)) {
    try {
      const { supabase } = authResult;
      // Check ownership
      const { data: existing } = await supabase
        .from('marketplace_listings')
        .select('seller_id')
        .eq('id', id)
        .single();

      if (existing && existing.seller_id !== userId) {
        return apiError('forbidden', 'You can only update your own listings.', 403);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (body.title) updateData.title = body.title.trim();
      if (body.description) updateData.description = body.description.trim();
      if (body.price !== undefined) updateData.price = body.price;
      if (body.category) updateData.category = body.category;
      if (body.condition) updateData.condition = body.condition;
      if (body.location) updateData.location = body.location.trim();
      if (body.status) updateData.status = body.status;
      if (body.images) updateData.images = body.images;
      if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone;

      const { data: updatedDb, error: updateError } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (!updateError && updatedDb) {
        return apiSuccess(updatedDb);
      }
    } catch {
      // Fallback
    }
  }

  // In-memory fallback
  const found = INITIAL_MARKETPLACE_LISTINGS.find((item) => item.id === id);
  if (!found) {
    return apiError('listing_not_found', 'This listing could not be found.', 404);
  }

  if (body.title) found.title = body.title.trim();
  if (body.description) found.description = body.description.trim();
  if (body.price !== undefined) found.price = body.price;
  if (body.category) found.category = body.category;
  if (body.condition) found.condition = body.condition;
  if (body.location) found.location = body.location.trim();
  if (body.status) found.status = body.status;
  if (body.images) found.images = body.images;
  if (body.contact_phone !== undefined) found.seller_phone = body.contact_phone;
  found.updated_at = new Date().toISOString();

  return apiSuccess(found);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authResult = await authenticateRequest(request);
  const userId = isAuthenticatedRequest(authResult) ? authResult.user.id : null;

  if (isAuthenticatedRequest(authResult)) {
    try {
      const { supabase } = authResult;
      const { data: existing } = await supabase
        .from('marketplace_listings')
        .select('seller_id')
        .eq('id', id)
        .single();

      if (existing && existing.seller_id !== userId) {
        return apiError('forbidden', 'You can only delete your own listings.', 403);
      }

      await supabase.from('marketplace_listings').delete().eq('id', id);
      return apiSuccess({ deleted: true });
    } catch {
      // Fallback
    }
  }

  const index = INITIAL_MARKETPLACE_LISTINGS.findIndex((item) => item.id === id);
  if (index !== -1) {
    INITIAL_MARKETPLACE_LISTINGS.splice(index, 1);
  }

  return apiSuccess({ deleted: true });
}
