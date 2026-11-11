import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logSecurityEvent } from './request-log';

type AuthenticatedRequest = {
  supabase: SupabaseClient;
  user: User;
};

function requiredEnvironment(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = name === 'NEXT_PUBLIC_SUPABASE_URL'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error(name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? `Server configuration is missing ${name}.`
      : 'Server configuration is missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return value;
}

export function createUserSupabase(accessToken: string) {
  return createClient(
    requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}

export function createPublicSupabase() {
  return createClient(
    requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * A user with an active strike can still read and delete their own things, but cannot post, comment,
 * message or upload until the restriction ends (suspensions and bans both lift on their own).
 * If the check itself fails we let the request through: an outage must not lock everyone out.
 */
async function restrictionResponse(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('get_my_restriction');
  if (error) {
    console.error('Restriction check failed.', { code: error.code ?? 'unknown' });
    return null;
  }
  const active = Array.isArray(data) ? data[0] : null;
  if (!active) return null;
  const until = new Date(active.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return apiError(
    'account_restricted',
    active.kind === 'ban'
      ? `Your account is suspended until ${until} for breaking the community rules. It reopens automatically.`
      : `Your account is paused until ${until} for breaking the community rules.`,
    403,
  );
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedRequest | NextResponse> {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    logSecurityEvent(request, 'auth_failed', { status: 401, flag: 'no token' });
    return apiError('unauthorized', 'Sign in to continue.', 401);
  }

  try {
    const supabase = createUserSupabase(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      logSecurityEvent(request, 'auth_failed', { status: 401, flag: 'invalid or expired token' });
      return apiError('unauthorized', 'Your session is invalid or expired. Sign in again.', 401);
    }
    if (WRITE_METHODS.has(request.method)) {
      const restricted = await restrictionResponse(supabase);
      if (restricted) return restricted;
    }
    return { supabase, user: data.user };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Server configuration is missing ')) {
      return apiError('server_not_configured', error.message, 503);
    }
    throw error;
  }
}

export function isAuthenticatedRequest(value: AuthenticatedRequest | NextResponse): value is AuthenticatedRequest {
  return !(value instanceof NextResponse);
}

export function requireRegisteredUser(auth: AuthenticatedRequest): NextResponse | null {
  return auth.user.is_anonymous
    ? apiError('account_required', 'Create an account to perform this action.', 403)
    : null;
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function parseJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
