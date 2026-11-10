'use client';

import type { Session } from '@supabase/supabase-js';

type Envelope<T> = { data: T };
type Failure = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * JSON call to the app's /api/v1 routes. Sends the bearer token when a session exists,
 * unwraps { data } and turns { error } bodies into ApiError.
 */
export async function apiRequest<T>(
  path: string,
  options: { session?: Session | null; token?: string | null; method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const token = options.token ?? options.session?.access_token ?? null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('We could not reach Common Room. Check your connection and try again.', 0, 'network');
  }
  const result = (await response.json().catch(() => null)) as Envelope<T> | Failure | null;
  if (!response.ok) {
    const failure = result as Failure | null;
    throw new ApiError(failure?.error?.message ?? `Request failed with status ${response.status}.`, response.status, failure?.error?.code);
  }
  if (!result || !('data' in result)) throw new ApiError('The server returned an invalid response.', response.status);
  return result.data;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
