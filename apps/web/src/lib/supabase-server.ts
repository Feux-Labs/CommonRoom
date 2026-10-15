import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function authenticateRequest(request: Request): Promise<AuthenticatedRequest | NextResponse> {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return apiError('unauthorized', 'Sign in to continue.', 401);
  }

  try {
    const supabase = createUserSupabase(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return apiError('unauthorized', 'Your session is invalid or expired. Sign in again.', 401);
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
