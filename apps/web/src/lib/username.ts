/** Rules for public usernames (@name). Shared by the sign-up screen and the API. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const RESERVED = new Set([
  'admin', 'administrator', 'support', 'moderator', 'mod', 'official', 'commonroom', 'staff', 'system',
  'help', 'root', 'api', 'www', 'null', 'undefined', 'anonymous', 'everyone', 'security', 'team',
]);

export function normaliseUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^@+/, '').toLowerCase() : '';
}

/** Returns an error message, or null when the username is acceptable. */
export function usernameError(value: unknown): string | null {
  const name = normaliseUsername(value);
  if (name.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `Use ${USERNAME_MAX} characters or fewer.`;
  if (!USERNAME_PATTERN.test(name)) return 'Use lowercase letters, numbers and underscores only.';
  if (RESERVED.has(name)) return 'That username is reserved. Pick another.';
  return null;
}

/** A starting username built from a display name, used when none was chosen. */
export function usernameFromName(displayName: string): string {
  const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 22);
  return base.length >= USERNAME_MIN && !RESERVED.has(base) ? base : 'member';
}

export function withSuffix(base: string, random: () => number = Math.random): string {
  const suffix = String(Math.floor(100 + random() * 9900));
  return `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
}
