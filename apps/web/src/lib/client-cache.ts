/**
 * A small browser-side cache so moving between tabs (Room, Anonymous, Market) shows what you already loaded straight
 * away, then quietly refreshes it. It lives in memory while the app is open and in sessionStorage so a refresh keeps it
 * too. Keys always include who is signed in, so one person's feed is never shown to another.
 */
const memory = new Map<string, { value: unknown; at: number }>();
const PREFIX = 'commonroom:cache:';
const MAX_AGE_MS = 30 * 60_000;

/** Who the cache belongs to: the account id inside the access token, or "public". */
export function cacheOwner(accessToken: string | null | undefined): string {
  if (!accessToken) return 'public';
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload)) as { sub?: string };
    return claims.sub ?? 'public';
  } catch {
    return 'public';
  }
}

export function cacheGet<T>(key: string, maxAgeMs = MAX_AGE_MS): T | undefined {
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && now - hit.at < maxAgeMs) return hit.value as T;
  try {
    const raw = typeof window === 'undefined' ? null : window.sessionStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { value: unknown; at: number };
    if (now - parsed.at >= maxAgeMs) return undefined;
    memory.set(key, parsed);
    return parsed.value as T;
  } catch {
    return undefined;
  }
}

export function cacheSet(key: string, value: unknown): void {
  const entry = { value, at: Date.now() };
  memory.set(key, entry);
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or blocked: the in-memory copy still works.
  }
}
