import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A fallback for uploads. Normally the browser sends the file straight to Cloudflare with a signed link. If the browser is not
 * allowed to (for example the bucket's CORS rule does not list this site yet), it sends the file to us instead and we pass it on.
 * The ticket for that is signed by the server for one person, one path, one file type and size, for ten minutes, so it cannot
 * be used to write anywhere else.
 */
function secret(): string {
  const value = process.env.R2_SECRET_ACCESS_KEY;
  if (!value) throw new Error('Media storage is not configured.');
  return value;
}

type Claims = { u: string; p: string; t: string; s: number; e: number };

export function signRelayTicket(userId: string, path: string, contentType: string, size: number, ttlSeconds = 600): string {
  const claims: Claims = { u: userId, p: path, t: contentType, s: size, e: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyRelayTicket(ticket: string, userId: string): Claims | null {
  const [body, signature] = ticket.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  let given: Buffer;
  try { given = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Claims;
    if (claims.u !== userId || claims.e < Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
}
