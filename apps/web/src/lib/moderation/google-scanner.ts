import { createSign } from 'node:crypto';
import { imageVerdict, videoVerdict, type ExplicitFrame, type Level, type SafeSearch } from './verdict';

/**
 * Photo and video scanning with Google Cloud (Vision SafeSearch for photos, Video Intelligence explicit-content
 * detection for videos). Needs a service account with those two APIs enabled. The JSON key goes in
 * GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON (one line). Without it scanning is simply off and reports/moderators remain.
 */
type Fetch = typeof fetch;
type Credentials = { client_email: string; private_key: string };

export function readCredentials(raw = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON): Credentials | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    return parsed.client_email && parsed.private_key ? { client_email: parsed.client_email, private_key: parsed.private_key } : null;
  } catch {
    return null;
  }
}

export function isScannerConfigured(): boolean {
  return readCredentials() !== null;
}

const base64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

/** Signed request for a Google access token (service account "JWT bearer" flow, RS256). */
export function buildAssertion(credentials: Credentials, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(credentials.private_key);
  return `${header}.${claims}.${base64Url(signature)}`;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(credentials: Credentials, fetchImpl: Fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: buildAssertion(credentials, now) }),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !body?.access_token) throw new Error(`Google sign-in for scanning failed (${response.status}).`);
  cachedToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) };
  return body.access_token;
}

export async function scanImage(bytes: Uint8Array, fetchImpl: Fetch = fetch): Promise<{ level: Level; detail: SafeSearch }> {
  const credentials = readCredentials();
  if (!credentials) throw new Error('Scanning is not configured.');
  const token = await accessToken(credentials, fetchImpl);
  const response = await fetchImpl('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: Buffer.from(bytes).toString('base64') }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] }] }),
  });
  const body = (await response.json().catch(() => null)) as { responses?: Array<{ safeSearchAnnotation?: SafeSearch; error?: { message?: string } }> } | null;
  const first = body?.responses?.[0];
  if (!response.ok || !first || first.error || !first.safeSearchAnnotation) throw new Error(`Photo scan failed (${response.status}).`);
  return { level: imageVerdict(first.safeSearchAnnotation), detail: first.safeSearchAnnotation };
}

type Operation = { name?: string; done?: boolean; error?: { message?: string }; response?: { annotationResults?: Array<{ explicitAnnotation?: { frames?: ExplicitFrame[] } }> } };

export async function scanVideo(bytes: Uint8Array, fetchImpl: Fetch = fetch, options: { pollMs?: number; timeoutMs?: number } = {}): Promise<{ level: Level; detail: { frames: number } }> {
  const credentials = readCredentials();
  if (!credentials) throw new Error('Scanning is not configured.');
  const { pollMs = 2000, timeoutMs = 45_000 } = options;
  const token = await accessToken(credentials, fetchImpl);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const start = await fetchImpl('https://videointelligence.googleapis.com/v1/videos:annotate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ inputContent: Buffer.from(bytes).toString('base64'), features: ['EXPLICIT_CONTENT_DETECTION'] }),
  });
  const started = (await start.json().catch(() => null)) as Operation | null;
  if (!start.ok || !started?.name) throw new Error(`Video scan could not start (${start.status}).`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const poll = await fetchImpl(`https://videointelligence.googleapis.com/v1/${started.name}`, { headers });
    const operation = (await poll.json().catch(() => null)) as Operation | null;
    if (!poll.ok || !operation) throw new Error(`Video scan check failed (${poll.status}).`);
    if (operation.done) {
      if (operation.error) throw new Error('Video scan failed.');
      const frames = operation.response?.annotationResults?.[0]?.explicitAnnotation?.frames ?? [];
      return { level: videoVerdict(frames), detail: { frames: frames.length } };
    }
  }
  throw new Error('Video scan is taking too long.');
}
