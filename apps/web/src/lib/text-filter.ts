import { apiError } from './supabase-server';

/**
 * Anonymous text can't carry ways to contact or find someone: phone numbers, email addresses and links.
 * On a platform where authors are hidden these are how people get doxxed, scammed or pulled off-platform.
 */
const PHONE = /(?:\+?234|\b0)[789][01]\d{8}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const LINK = /(?:\bhttps?:\/\/|\bwww\.|\b(?:t\.me|wa\.me|wa\.link|bit\.ly|tinyurl\.com|chat\.whatsapp\.com)\/)/i;

export function anonymousTextProblem(...texts: Array<string | undefined | null>): string | null {
  for (const raw of texts) {
    if (!raw) continue;
    // Join digits split by spaces, dots, dashes or brackets so "0803 123 4567" is caught.
    const squeezed = raw.replace(/(?<=\d)[\s().-]+(?=\d)/g, '');
    if (PHONE.test(squeezed) || EMAIL.test(raw) || LINK.test(raw)) {
      return 'Anonymous posts can’t include phone numbers, email addresses or links. Remove them and try again.';
    }
  }
  return null;
}

/** Returns a 422 response when the text isn't allowed, otherwise null. */
export function rejectUnsafeAnonymousText(...texts: Array<string | undefined | null>) {
  const problem = anonymousTextProblem(...texts);
  return problem ? apiError('text_not_allowed', problem, 422) : null;
}
