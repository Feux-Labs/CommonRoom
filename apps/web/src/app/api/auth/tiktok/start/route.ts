import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, isTikTokConfigured } from '@/lib/tiktok';
import { siteOrigin, TIKTOK_STATE_COOKIE } from '@/lib/tiktok-flow';

/** GET /api/auth/tiktok/start: sends the visitor to TikTok to approve signing in. */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  if (!isTikTokConfigured()) return NextResponse.redirect(`${origin}/auth/tiktok-complete?error=not_configured`);

  const state = randomBytes(24).toString('base64url');
  const response = NextResponse.redirect(buildAuthorizeUrl(`${origin}/api/auth/tiktok/callback`, state));
  // The state must come back unchanged and from the same browser, or the login is refused (stops forged logins).
  response.cookies.set(TIKTOK_STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https://'), path: '/api/auth/tiktok', maxAge: 600 });
  return response;
}
