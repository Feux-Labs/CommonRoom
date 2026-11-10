/**
 * Maps Supabase Auth failures to the copy used by the auth screens.
 * Codes come from @supabase/auth-js ErrorCode; status is used as a fallback
 * for older servers that do not send a code.
 */
export type AuthFailureKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'suspended'
  | 'rate_limited'
  | 'code_invalid'
  | 'account_exists'
  | 'weak_password'
  | 'same_password'
  | 'signups_disabled'
  | 'invalid_email'
  | 'network'
  | 'unknown';

export type AuthFailure = { kind: AuthFailureKind; message: string };

type ErrorLike = { code?: unknown; status?: unknown; message?: unknown; name?: unknown };

const COPY: Record<AuthFailureKind, string> = {
  invalid_credentials: 'Email or password is incorrect. Check them and try again.',
  email_not_confirmed: 'Verify your email before signing in. We can send you a new code.',
  suspended: 'This account is suspended. Contact support if you think this is a mistake.',
  rate_limited: 'Too many attempts. Try again in 5 minutes.',
  code_invalid: 'That code is wrong or has expired. Check it or ask for a new one.',
  account_exists: 'An account with this email already exists. Sign in instead.',
  weak_password: 'Choose a stronger password.',
  same_password: 'Choose a password you have not used for this account.',
  signups_disabled: 'New accounts are not open right now. Try again later.',
  invalid_email: 'Enter a valid email address.',
  network: 'We could not reach Common Room. Check your connection and try again.',
  unknown: 'Something went wrong. Try again.',
};

const CODE_TO_KIND: Record<string, AuthFailureKind> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_banned: 'suspended',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  otp_expired: 'code_invalid',
  user_already_exists: 'account_exists',
  email_exists: 'account_exists',
  weak_password: 'weak_password',
  same_password: 'same_password',
  signup_disabled: 'signups_disabled',
  email_provider_disabled: 'signups_disabled',
  email_address_invalid: 'invalid_email',
  validation_failed: 'invalid_email',
};

export function describeAuthError(error: unknown): AuthFailure {
  const value = (error ?? {}) as ErrorLike;
  const code = typeof value.code === 'string' ? value.code : '';
  const status = typeof value.status === 'number' ? value.status : 0;
  const name = typeof value.name === 'string' ? value.name : '';

  let kind: AuthFailureKind = CODE_TO_KIND[code] ?? 'unknown';
  if (kind === 'unknown') {
    if (status === 429) kind = 'rate_limited';
    else if (name === 'AuthRetryableFetchError' || error instanceof TypeError) kind = 'network';
  }
  return { kind, message: COPY[kind] };
}

export function authFailureMessage(kind: AuthFailureKind) {
  return COPY[kind];
}
