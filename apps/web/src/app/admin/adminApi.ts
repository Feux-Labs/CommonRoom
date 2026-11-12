import type { Session } from '@supabase/supabase-js';
import { cacheGet, cacheOwner, cacheSet } from '@/lib/client-cache';

/** One call to an admin API with the signed-in staff member's token. Throws the server's message on failure. */
export async function adminCall<T>(session: Session, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok || !result || !('data' in result)) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  return result.data as T;
}

/**
 * Admin screens keep what they last loaded in this browser tab, so coming back shows it straight away and refreshes quietly.
 * Keyed by who is signed in. Never put secrets in here (passwords are stripped before anything is written).
 */
const ADMIN_CACHE_MS = 6 * 60 * 60 * 1000;
const adminKey = (session: Session, path: string) => `admin:${cacheOwner(session.access_token)}:${path}`;
export const adminCacheRead = <T>(session: Session, path: string): T | undefined => cacheGet<T>(adminKey(session, path), ADMIN_CACHE_MS);
export const adminCacheWrite = (session: Session, path: string, data: unknown): void => cacheSet(adminKey(session, path), data);

export type AdminMe = { role: 'owner' | 'admin' | 'moderator' | 'support' | 'analyst'; email: string; permissions: string[]; creationLocked: boolean };

export const naira = (value: number) => `₦${Math.round(value).toLocaleString()}`;
