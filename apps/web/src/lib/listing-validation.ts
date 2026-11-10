import { isOwnStorageUrl } from './media-url';

export const LISTING_CATEGORIES = ['textbooks', 'electronics', 'hostel', 'fashion', 'services', 'food', 'other'] as const;
export const LISTING_CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const;
/** Statuses a seller may set. 'removed' belongs to moderators only. */
export const SELLER_STATUSES = ['available', 'sold', 'reserved'] as const;

export const MAX_PRICE = 100_000_000;
export const MAX_LISTING_IMAGES = 4;

export type ListingFields = {
  title?: string;
  description?: string;
  price?: number;
  category?: (typeof LISTING_CATEGORIES)[number];
  condition?: (typeof LISTING_CONDITIONS)[number];
  location?: string;
  school?: string | null;
  images?: string[];
  contact_phone?: string | null;
  status?: (typeof SELLER_STATUSES)[number];
};

type Parsed = { ok: true; data: ListingFields } | { ok: false; code: string; message: string; status: 422 };

const fail = (code: string, message: string): Parsed => ({ ok: false, code, message, status: 422 });
const includes = <T extends readonly string[]>(list: T, value: unknown): value is T[number] => typeof value === 'string' && (list as readonly string[]).includes(value);

/**
 * Validates a listing body. With `partial` (updates) only the fields present are checked and returned;
 * without it (create) title, description, price, category, location and at least one image are required.
 */
export function parseListingFields(body: Record<string, unknown>, partial: boolean): Parsed {
  const data: ListingFields = {};
  const has = (key: string) => body[key] !== undefined;

  if (!partial || has('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 3 || title.length > 100) return fail('invalid_title', 'Title must be 3 to 100 characters.');
    data.title = title;
  }
  if (!partial || has('description')) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length < 5 || description.length > 1000) return fail('invalid_description', 'Add details of 5 to 1,000 characters.');
    data.description = description;
  }
  if (!partial || has('price')) {
    const price = body.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      return fail('invalid_price', 'Price must be a number above 0.');
    }
    data.price = Math.round(price);
  }
  if (!partial || has('category')) {
    if (!includes(LISTING_CATEGORIES, body.category)) return fail('invalid_category', 'Choose a valid category.');
    data.category = body.category;
  }
  if (has('condition') || !partial) {
    const condition = body.condition ?? 'good';
    if (!includes(LISTING_CONDITIONS, condition)) return fail('invalid_condition', 'Choose a valid condition.');
    data.condition = condition;
  }
  if (!partial || has('location')) {
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    if (location.length < 2 || location.length > 120) return fail('invalid_location', 'Add a location of 2 to 120 characters.');
    data.location = location;
  }
  if (has('school')) {
    if (body.school !== null && (typeof body.school !== 'string' || body.school.length > 160)) return fail('invalid_school', 'School name is not valid.');
    data.school = body.school === null ? null : String(body.school).trim() || null;
  }
  if (!partial || has('images')) {
    const images = body.images;
    if (!Array.isArray(images) || images.length < 1 || images.length > MAX_LISTING_IMAGES || !images.every((url) => isOwnStorageUrl(url))) {
      return fail('invalid_images', `Add 1 to ${MAX_LISTING_IMAGES} photos uploaded through the app.`);
    }
    data.images = images as string[];
  }
  if (has('contact_phone')) {
    const phone = body.contact_phone;
    if (phone === null || phone === '') data.contact_phone = null;
    else if (typeof phone === 'string' && /^[+\d][\d\s-]{6,19}$/.test(phone.trim())) data.contact_phone = phone.trim();
    else return fail('invalid_phone', 'Enter a valid phone number, or leave it empty.');
  }
  if (has('status')) {
    if (!includes(SELLER_STATUSES, body.status)) return fail('invalid_status', 'Choose available, sold or unavailable.');
    data.status = body.status;
  }
  return { ok: true, data };
}
