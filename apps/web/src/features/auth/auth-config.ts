import { usernameError } from '@/lib/username';

/**
 * Auth rules shared by the sign-up, verification and reset screens.
 *
 * OTP_LENGTH and OTP_EXPIRY_MINUTES must match the Supabase Auth settings
 * (Authentication → Providers → Email → "Email OTP Length" / "Email OTP Expiration").
 * The confirmation and recovery email templates must include {{ .Token }} for the
 * code-based screens to receive a code.
 */
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
/** Supabase allows one auth email per address every 60 seconds by default. */
export const RESEND_COOLDOWN_SECONDS = 60;

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = { id: 'length' | 'number' | 'letter'; label: string; test: (value: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: 'number', label: 'One number', test: (value) => /\d/.test(value) },
  { id: 'letter', label: 'One letter', test: (value) => /\p{L}/u.test(value) },
];

export function passwordMeetsRules(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export { normaliseUsername } from '@/lib/username';

/** Same rules the server enforces (lib/username.ts). Empty input is not an error yet. */
export function usernameProblem(value: string): string | null {
  return value.trim() ? usernameError(value) : null;
}
