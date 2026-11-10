import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCode, fetchProfile, isTikTokConfigured } from '@/lib/tiktok';
import { siteOrigin, TIKTOK_STATE_COOKIE } from '@/lib/tiktok-flow';

function finish(origin: string, outcome: { error: string } | { accessToken: string; refreshToken: string }) {
  // Tokens travel in the address FRAGMENT (after #) so they never reach any server log. The page there signs the browser in.
  const target = 'error' in outcome
    ? `${origin}/auth/tiktok-complete?error=${encodeURIComponent(outcome.error)}`
    : `${origin}/auth/tiktok-complete#access_token=${encodeURIComponent(outcome.accessToken)}&refresh_token=${encodeURIComponent(outcome.refreshToken)}`;
  const response = NextResponse.redirect(target);
  response.cookies.set(TIKTOK_STATE_COOKIE, '', { path: '/api/auth/tiktok', maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function sameState(given: string | undefined, wanted: string | null): boolean {
  if (!given || !wanted) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** GET /api/auth/tiktok/callback: TikTok sends the visitor back here with a one-time code. */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const params = new URL(request.url).searchParams;
  if (!isTikTokConfigured()) return finish(origin, { error: 'not_configured' });
  if (params.get('error')) return finish(origin, { error: 'cancelled' });

  const cookie = request.headers.get('cookie')?.split(/;\s*/).find((part) => part.startsWith(`${TIKTOK_STATE_COOKIE}=`))?.slice(TIKTOK_STATE_COOKIE.length + 1);
  const code = params.get('code');
  if (!code || !sameState(cookie, params.get('state'))) return finish(origin, { error: 'invalid_state' });

  try {
    const { accessToken, openId } = await exchangeCode(code, `${origin}/api/auth/tiktok/callback`);
    const { displayName } = await fetchProfile(accessToken);

    // A fresh random password every time: it is used once, right below, and is never stored or shown.
    const password = randomBytes(32).toString('hex');
    const rows = await prisma.$queryRaw<Array<{ email: string }>>`select public.tiktok_login(${openId}, ${displayName}, ${password}) as email`;
    const email = rows[0]?.email;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!email || !supabaseUrl || !key) throw new Error('Sign-in is not configured.');

    const signIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const session = (await signIn.json().catch(() => null)) as { access_token?: string; refresh_token?: string } | null;
    if (!signIn.ok || !session?.access_token || !session.refresh_token) throw new Error(`Sign-in was refused (${signIn.status}).`);
    return finish(origin, { accessToken: session.access_token, refreshToken: session.refresh_token });
  } catch (error) {
    console.error('TikTok sign-in failed.', error instanceof Error ? error.message : 'unknown');
    return finish(origin, { error: 'failed' });
  }
}
