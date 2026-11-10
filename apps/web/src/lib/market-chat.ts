import { apiError } from './supabase-server';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns a marketplace-chat database error into a clear API response. */
export function marketChatError(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? '';
  const known: Array<[string, string, number, string]> = [
    ['account_required', 'account_required', 403, 'Create an account to message sellers.'],
    ['listing_not_found', 'listing_not_found', 404, 'That listing is no longer available.'],
    ['own_listing', 'own_listing', 422, 'This is your own listing.'],
    ['thread_not_found', 'thread_not_found', 404, 'That conversation could not be found.'],
    ['invalid_message', 'invalid_message', 422, 'Write a message of up to 1,000 characters.'],
    ['listing_unavailable', 'listing_unavailable', 409, 'This item is no longer available, so the conversation is closed.'],
    ['anonymous_rate_limit_exceeded', 'rate_limited', 429, 'You’re doing that too often. Please try again in a moment.'],
  ];
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return apiError(match[1], match[3], match[2]);
  console.error('Marketplace chat request failed.', { code: error.code ?? 'unknown' });
  return apiError('market_chat_failed', fallback, 500);
}
