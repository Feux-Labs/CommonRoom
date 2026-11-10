'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';
import type {
  CreateListingInput,
  ListingCondition,
  ListingStatus,
  MarketplaceCategory,
  MarketplaceListing,
} from '@/lib/marketplace-contracts';

export type MarketTab = 'explore' | 'saved' | 'my_listings';
export type MarketSort = 'newest' | 'price_asc' | 'price_desc' | 'relevance';

export type MarketQuery = {
  tab: MarketTab;
  search: string;
  category: MarketplaceCategory | 'all';
  sort: MarketSort;
  school: string;
  minPrice: string;
  maxPrice: string;
  conditions: ListingCondition[];
};

export const DEFAULT_QUERY: MarketQuery = {
  tab: 'explore',
  search: '',
  category: 'all',
  sort: 'newest',
  school: '',
  minPrice: '',
  maxPrice: '',
  conditions: [],
};

/** Short chip labels (mockup) mapped to the API categories. */
export const CATEGORY_CHIPS: { id: MarketplaceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'textbooks', label: 'Books' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'services', label: 'Services' },
  { id: 'food', label: 'Food' },
  { id: 'other', label: 'Other' },
];

export const SORT_OPTIONS: { id: MarketSort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'relevance', label: 'Relevance' },
];

/** Mockup shows New / Like new / Used; the API also stores good and fair, both shown as Used. */
export const CONDITION_OPTIONS: { id: ListingCondition; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'like_new', label: 'Like new' },
  { id: 'good', label: 'Used' },
];

export function conditionLabel(condition: ListingCondition): string {
  if (condition === 'new') return 'New';
  if (condition === 'like_new') return 'Like new';
  return 'Used';
}

export function categoryLabel(category: MarketplaceCategory): string {
  return CATEGORY_CHIPS.find((item) => item.id === category)?.label ?? 'Other';
}

export function statusLabel(status: ListingStatus): string {
  if (status === 'available') return 'Active';
  if (status === 'sold') return 'Sold';
  if (status === 'reserved') return 'Unavailable';
  return 'Removed';
}

export const MAX_LISTING_PHOTOS = 4;

export async function fetchListings(session: Session | null, query: MarketQuery): Promise<MarketplaceListing[]> {
  const params = new URLSearchParams({ tab: query.tab, sort: query.sort, limit: '50' });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.category !== 'all') params.set('category', query.category);
  if (query.school) params.set('school', query.school);
  if (query.minPrice) params.set('minPrice', query.minPrice);
  if (query.maxPrice) params.set('maxPrice', query.maxPrice);
  const listings = await apiRequest<MarketplaceListing[]>(`/api/v1/marketplace/listings?${params}`, { session });
  // Condition is not an API filter yet; narrow the returned page on the client.
  if (!query.conditions.length) return listings;
  return listings.filter((listing) => query.conditions.some((condition) => (
    condition === 'good' ? listing.condition === 'good' || listing.condition === 'fair' : listing.condition === condition
  )));
}

export function fetchListing(session: Session | null, id: string) {
  return apiRequest<MarketplaceListing>(`/api/v1/marketplace/listings/${encodeURIComponent(id)}`, { session });
}

export function toggleSaved(session: Session, id: string) {
  return apiRequest<{ saved: boolean }>(`/api/v1/marketplace/listings/${encodeURIComponent(id)}/save`, { session, method: 'POST' });
}

export function updateListing(session: Session, id: string, body: Partial<CreateListingInput> & { status?: ListingStatus }) {
  return apiRequest<MarketplaceListing>(`/api/v1/marketplace/listings/${encodeURIComponent(id)}`, { session, method: 'PUT', body });
}

export function createListing(session: Session, body: CreateListingInput) {
  return apiRequest<MarketplaceListing>('/api/v1/marketplace/listings', { session, method: 'POST', body });
}

export function deleteListing(session: Session, id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/marketplace/listings/${encodeURIComponent(id)}`, { session, method: 'DELETE' });
}

export function reportListing(session: Session, id: string, reason: string, details: string) {
  return apiRequest(`/api/v1/marketplace/listings/${encodeURIComponent(id)}/report`, { session, method: 'POST', body: { reason, details } });
}

/** wa.me needs international format; Nigerian numbers are stored as 080… or +234…. */
export function whatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  return digits.length >= 10 ? digits : null;
}
