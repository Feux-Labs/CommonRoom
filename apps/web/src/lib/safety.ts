import { apiError } from './supabase-server';

export const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns a block/mute database error into a clear API response. */
export function safetyError(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? '';
  if (message.includes('account_required')) return apiError('account_required', 'Create an account to block or mute people.', 403);
  if (message.includes('invalid_user')) return apiError('invalid_user', 'You can’t do that to yourself.', 422);
  if (message.includes('user_not_found')) return apiError('user_not_found', 'That person could not be found.', 404);
  console.error('Safety request failed.', { code: error.code ?? 'unknown' });
  return apiError('safety_failed', fallback, 500);
}
