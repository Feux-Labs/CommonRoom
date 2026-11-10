import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from './supabase-server';

/**
 * Per-user limit on one kind of write, counted in the database so it holds across servers.
 * Returns a 429 response when the user is over the limit, otherwise null. If the counter itself fails we let the
 * request through: an outage must not stop everyone from posting.
 */
export async function rateLimit(supabase: SupabaseClient, action: string, limit: number, windowSeconds: number) {
  const { error } = await supabase.rpc('consume_rate_limit', {
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (!error) return null;
  if ((error.message ?? '').includes('anonymous_rate_limit_exceeded')) {
    return apiError('rate_limited', 'You’re doing that too often. Please try again later.', 429);
  }
  console.error('Rate limit check failed.', { code: error.code ?? 'unknown' });
  return null;
}
