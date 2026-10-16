import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import { INITIAL_MARKETPLACE_LISTINGS } from '@/lib/marketplace-seed';
import type { CreateListingInput, MarketplaceCategory, MarketplaceListing } from '@/lib/marketplace-contracts';

type MarketplaceListingRow = {
  id: string;
  seller_id: string;
  seller: { display_name: string | null; username: string | null; school: string | null } | null;
  contact_phone: string | null;
  title: string;
  description: string;
  price: number | string;
  category: MarketplaceCategory;
  condition: MarketplaceListing['condition'];
  location: string;
  school: string | null;
  images: unknown;
  status: MarketplaceListing['status'];
  views_count: number | null;
  created_at: string;
  updated_at: string;
};

// In-memory runtime store for development & mock fallback
const memoryListings: MarketplaceListing[] = [...INITIAL_MARKETPLACE_LISTINGS];
const memorySavedSet: Map<string, Set<string>> = new Map(); // userId -> Set<listingId>

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as MarketplaceCategory | 'all' | null;
  const search = searchParams.get('search')?.trim().toLowerCase() || '';
  const school = searchParams.get('school')?.trim() || '';
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const sort = searchParams.get('sort') || 'newest';
  const tab = searchParams.get('tab') || 'explore'; // 'explore' | 'saved' | 'my_listings'
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));

  // Check auth if available
  let userId: string | null = null;
  let canContactSeller = false;
  const authResult = await authenticateRequest(request);
  if (isAuthenticatedRequest(authResult)) {
    userId = authResult.user.id;
    canContactSeller = !authResult.user.is_anonymous;
    if (authResult.user.is_anonymous && tab !== 'explore') {
      return apiError('account_required', 'Create an account to view saved or personal listings.', 403);
    }
  }

  // If Supabase is connected and tables exist, attempt Supabase query
  if (isAuthenticatedRequest(authResult)) {
    try {
      const { supabase } = authResult;
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          seller:profiles!seller_id(display_name, username, school)
        `);

      if (tab === 'my_listings') {
        query = query.eq('seller_id', userId);
      } else {
        query = query.neq('status', 'removed');
      }

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (school) {
        query = query.eq('school', school);
      }

      if (minPrice !== undefined && !isNaN(minPrice)) {
        query = query.gte('price', minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        query = query.lte('price', maxPrice);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
      }

      if (sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: dbListings, error: dbError } = await query.limit(limit);

      if (!dbError && dbListings && dbListings.length > 0) {
        // Fetch saved status for this user
        let savedIds = new Set<string>();
        if (userId) {
          const { data: savedRows } = await supabase
            .from('marketplace_saved')
            .select('listing_id')
            .eq('user_id', userId);
          if (savedRows) {
            savedIds = new Set(savedRows.map((r: { listing_id: string }) => r.listing_id));
          }
        }

        const mapped: MarketplaceListing[] = (dbListings as unknown as MarketplaceListingRow[]).map((row) => ({
          id: row.id,
          seller_id: row.seller_id,
          seller_name: row.seller?.display_name || 'Campus Student',
          seller_username: row.seller?.username || null,
          seller_avatar: null,
          seller_school: row.seller?.school || row.school || null,
          seller_phone: canContactSeller ? row.contact_phone || null : null,
          title: row.title,
          description: row.description,
          price: Number(row.price),
          category: row.category,
          condition: row.condition,
          location: row.location,
          school: row.school,
          images: Array.isArray(row.images) ? row.images : [],
          status: row.status,
          likes_count: 0,
          views_count: row.views_count || 0,
          is_saved: savedIds.has(row.id),
          is_mine: userId === row.seller_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

        if (tab === 'saved') {
          return apiSuccess(mapped.filter((item) => item.is_saved));
        }

        return apiSuccess(mapped);
      }
    } catch {
      // Fallback to memory store below
    }
  }

  // In-memory fallback
  const userSaved = (userId && memorySavedSet.get(userId)) || new Set<string>();

  let filtered = memoryListings.filter((item) => {
    if (tab === 'my_listings') {
      return item.is_mine || (userId && item.seller_id === userId);
    }
    if (tab === 'saved') {
      return item.is_saved || userSaved.has(item.id);
    }
    if (item.status === 'removed') return false;
    return true;
  });

  if (category && category !== 'all') {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (school) {
    filtered = filtered.filter((item) => !item.school || item.school.toLowerCase().includes(school.toLowerCase()));
  }

  if (minPrice !== undefined && !isNaN(minPrice)) {
    filtered = filtered.filter((item) => item.price >= minPrice);
  }

  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    filtered = filtered.filter((item) => item.price <= maxPrice);
  }

  if (search) {
    filtered = filtered.filter((item) =>
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.location.toLowerCase().includes(search)
    );
  }

  // Sort and Recommendation ranking (Phase 5 Recommendation: relevance, freshness, popularity, price)
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === 'popular') {
    filtered.sort((a, b) => (b.views_count + b.likes_count * 3) - (a.views_count + a.likes_count * 3));
  } else {
    // Newest / Relevance: Available items first, then newer
    filtered.sort((a, b) => {
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (b.status === 'available' && a.status !== 'available') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  const result = filtered.map((item) => ({
    ...item,
    seller_phone: canContactSeller ? item.seller_phone : null,
    is_saved: item.is_saved || userSaved.has(item.id),
    is_mine: item.is_mine || (userId !== null && item.seller_id === userId),
  }));

  return apiSuccess(result);
}

export async function POST(request: Request) {
  const body = (await parseJson(request)) as CreateListingInput | null;
  if (!body) return apiError('invalid_body', 'Invalid request body.', 400);

  const { title, description, price, category, condition = 'good', location, school = null, images = [], contact_phone } = body;

  if (!title || title.trim().length < 3) {
    return apiError('invalid_title', 'Listing title must be at least 3 characters.', 422);
  }
  if (!description || description.trim().length < 5) {
    return apiError('invalid_description', 'Please add a descriptive detail of at least 5 characters.', 422);
  }
  if (price === undefined || isNaN(price) || price < 0) {
    return apiError('invalid_price', 'Price must be a positive number.', 422);
  }
  if (!category) {
    return apiError('invalid_category', 'Please select a valid category.', 422);
  }
  if (!location || location.trim().length < 2) {
    return apiError('invalid_location', 'Please specify a campus location (e.g. hostel, faculty, gate).', 422);
  }

  const authResult = await authenticateRequest(request);
  if (!isAuthenticatedRequest(authResult)) return authResult;
  const accountError = requireRegisteredUser(authResult);
  if (accountError) return accountError;

  const sellerId = authResult.user.id;
  const sellerName = (authResult.user.user_metadata?.display_name as string) || 'Campus Student';
  const sellerUsername = (authResult.user.user_metadata?.username as string) || null;
  const sellerSchool = school;

  try {
    const { data: dbItem, error: insertError } = await authResult.supabase
      .from('marketplace_listings')
      .insert({
        seller_id: sellerId,
        title: title.trim(),
        description: description.trim(),
        price,
        category,
        condition,
        location: location.trim(),
        school: sellerSchool,
        images: images.slice(0, 8),
        contact_phone: contact_phone?.trim() || null,
        status: 'available',
      })
      .select()
      .single();

    if (insertError || !dbItem) {
      console.error('[marketplace] listing creation failed:', insertError?.message);
      return apiError('listing_create_failed', 'Your listing could not be published.', 500);
    }

    const created: MarketplaceListing = {
      id: dbItem.id,
      seller_id: sellerId,
      seller_name: sellerName,
      seller_username: sellerUsername,
      seller_avatar: null,
      seller_school: sellerSchool,
      seller_phone: contact_phone?.trim() || null,
      title: dbItem.title,
      description: dbItem.description,
      price: Number(dbItem.price),
      category: dbItem.category,
      condition: dbItem.condition,
      location: dbItem.location,
      school: dbItem.school,
      images: Array.isArray(dbItem.images) ? dbItem.images : [],
      status: 'available',
      likes_count: 0,
      views_count: 0,
      is_saved: false,
      is_mine: true,
      created_at: dbItem.created_at,
      updated_at: dbItem.updated_at,
    };
    return apiSuccess(created, 201);
  } catch (error) {
    console.error('[marketplace] listing creation failed:', error);
    return apiError('listing_create_failed', 'Your listing could not be published.', 500);
  }
}
