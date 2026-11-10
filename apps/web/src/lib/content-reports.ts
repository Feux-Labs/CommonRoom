import { apiError } from './supabase-server';

/** Turns a chat-message / profile report database error into a clear API response. */
export function contentReportError(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? '';
  const known: Array<[string, string, number, string]> = [
    ['account_required', 'account_required', 403, 'Create an account to report.'],
    ['invalid_reason', 'invalid_reason', 422, 'Add a short reason (3 to 500 characters).'],
    ['message_not_found', 'message_not_found', 404, 'That message could not be found.'],
    ['own_message', 'own_message', 422, 'You can’t report your own message.'],
    ['own_profile', 'own_profile', 422, 'You can’t report yourself.'],
    ['user_not_found', 'user_not_found', 404, 'That person could not be found.'],
    ['anonymous_rate_limit_exceeded', 'rate_limited', 429, 'You’re reporting too often. Please try again later.'],
  ];
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return apiError(match[1], match[3], match[2]);
  console.error('Report request failed.', { code: error.code ?? 'unknown' });
  return apiError('report_failed', fallback, 500);
}
