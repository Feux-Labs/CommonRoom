/**
 * Sign in with TikTok (Login Kit v2, web). Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET. Optional overrides for testing:
 * TIKTOK_AUTH_BASE (default https://www.tiktok.com) and TIKTOK_API_BASE (default https://open.tiktokapis.com).
 */
type Fetch = typeof fetch;

export class TikTokNotConfiguredError extends Error {
  constructor() {
    super('TikTok login is not set up yet.');
  }
}

function credentials() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new TikTokNotConfiguredError();
  return { clientKey, clientSecret };
}

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

const authBase = () => (process.env.TIKTOK_AUTH_BASE || 'https://www.tiktok.com').replace(/\/$/, '');
const apiBase = () => (process.env.TIKTOK_API_BASE || 'https://open.tiktokapis.com').replace(/\/$/, '');

/** Where we send the person to approve the login. `state` ties the reply to the browser that started it. */
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientKey } = credentials();
  const params = new URLSearchParams({ client_key: clientKey, scope: 'user.info.basic', response_type: 'code', redirect_uri: redirectUri, state });
  return `${authBase()}/v2/auth/authorize/?${params.toString()}`;
}

/** Trades the one-time code TikTok sent back for the person's TikTok id and an access token. */
export async function exchangeCode(code: string, redirectUri: string, fetchImpl: Fetch = fetch): Promise<{ accessToken: string; openId: string }> {
  const { clientKey, clientSecret } = credentials();
  const response = await fetchImpl(`${apiBase()}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; open_id?: string; error?: string; error_description?: string } | null;
  if (!response.ok || !body?.access_token || !body.open_id) throw new Error(`TikTok refused the login code (${response.status}) ${body?.error ?? ''}`.trim());
  return { accessToken: body.access_token, openId: body.open_id };
}

export async function fetchProfile(accessToken: string, fetchImpl: Fetch = fetch): Promise<{ displayName: string }> {
  const response = await fetchImpl(`${apiBase()}/v2/user/info/?fields=open_id,display_name`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = (await response.json().catch(() => null)) as { data?: { user?: { display_name?: string } } } | null;
  // The name is only a friendly default for the sign-up form: if TikTok does not give one, carry on without it.
  return { displayName: response.ok ? (body?.data?.user?.display_name ?? '') : '' };
}
