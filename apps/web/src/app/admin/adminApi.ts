import type { Session } from '@supabase/supabase-js';

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

export type AdminMe = { role: 'owner' | 'admin' | 'moderator' | 'support' | 'analyst'; email: string; permissions: string[]; creationLocked: boolean };

export const naira = (value: number) => `₦${Math.round(value).toLocaleString()}`;
