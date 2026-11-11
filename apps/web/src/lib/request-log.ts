import { after } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * What people call, so the owner can see which endpoints are used and spot someone probing the app.
 * Logging happens after the response is sent and can never break a request.
 */

const SCANNER_PATHS = /(?:^|\/)(?:\.env|\.git|\.aws|\.ssh|wp-admin|wp-login|wp-content|xmlrpc\.php|phpmyadmin|actuator|server-status|cgi-bin|config\.json|backup\.sql|id_rsa|\.DS_Store|vendor\/phpunit|admin\.php|shell\.php)/i;
const TRAVERSAL = /\.\.[\\/]|%2e%2e|%252e/i;
const SQLI = /union(?:\s|\+|%20)+(?:all(?:\s|\+|%20)+)?select|(?:'|%27)(?:\s|\+|%20)*or(?:\s|\+|%20)+(?:'|%27)?\d|sleep\(|benchmark\(|information_schema|pg_sleep|;(?:\s|\+|%20)*drop(?:\s|\+|%20)|xp_cmdshell/i;
const XSS = /<script|%3cscript|javascript:|onerror\s*=|onload\s*=/i;
const ATTACK_TOOLS = /sqlmap|nikto|nmap|masscan|zgrab|gobuster|dirbuster|wpscan|hydra|acunetix|nessus|burp|metasploit|havij/i;
const SCRIPT_CLIENTS = /\b(?:curl|wget|python-requests|python-urllib|go-http-client|libwww-perl|httpie|postmanruntime|insomnia|axios|node-fetch|okhttp|java\/)/i;

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

/** Why a request looks suspicious, or null. "attack:" is a known attack pattern; "script:" is a script or tool rather than a browser. */
export function classifyRequest(path: string, query: string, userAgent: string): string | null {
  const decodedPath = safeDecode(path);
  const decodedQuery = safeDecode(query.replace(/\+/g, ' '));
  const target = `${decodedPath}?${decodedQuery}`;
  if (TRAVERSAL.test(path) || TRAVERSAL.test(query) || TRAVERSAL.test(decodedPath) || TRAVERSAL.test(decodedQuery)) return 'attack: path traversal';
  if (SQLI.test(target)) return 'attack: SQL injection pattern';
  if (XSS.test(target)) return 'attack: script injection pattern';
  if (SCANNER_PATHS.test(path)) return 'attack: probing for a sensitive file';
  if (ATTACK_TOOLS.test(userAgent)) return 'attack: known hacking tool';
  if (SCRIPT_CLIENTS.test(userAgent)) return `script: ${(userAgent.match(SCRIPT_CLIENTS)?.[0] ?? 'script client').toLowerCase()}`;
  if (!userAgent) return 'script: no user agent';
  return null;
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || headers.get('cf-connecting-ip') || null;
}

/** Who a bearer token says it is. Only for the log: it is NOT verified here. */
export function tokenSubject(headers: Headers): string | null {
  const token = headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string };
    return payload.sub && /^[0-9a-f-]{36}$/i.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export type LogRow = { kind: string; method: string; path: string; query: string; ip: string | null; ua: string; country: string | null; userId: string | null; status: number | null; flag: string | null };

export async function writeLog(row: LogRow): Promise<void> {
  try {
    await prisma.$executeRaw`
      insert into public.request_log (kind, method, path, query, ip, ua, country, user_id, status, flag)
      values (${row.kind}, ${row.method}, ${row.path.slice(0, 300)}, ${row.query.slice(0, 500)}, ${row.ip}, ${row.ua.slice(0, 300)}, ${row.country}, ${row.userId}::uuid, ${row.status}, ${row.flag})`;
    // Keep two weeks. Tidy up now and then rather than on a schedule.
    if (Math.random() < 0.01) await prisma.$executeRaw`delete from public.request_log where ts < now() - interval '14 days'`;
  } catch {
    // Monitoring is best effort.
  }
}

export function rowFor(request: Request, kind: string, extra: { userId?: string | null; status?: number | null; flag?: string | null } = {}): LogRow {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') ?? '';
  return {
    kind, method: request.method, path: url.pathname, query: url.search.replace(/^\?/, ''), ip: clientIp(request.headers), ua,
    country: request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry'),
    userId: extra.userId ?? tokenSubject(request.headers), status: extra.status ?? null,
    flag: extra.flag ?? classifyRequest(url.pathname, url.search.replace(/^\?/, ''), ua),
  };
}

/** Records a security-relevant outcome (failed sign-in token, staff access denied, rate limit) from inside a route. */
export function logSecurityEvent(request: Request, kind: 'auth_failed' | 'admin_denied' | 'rate_limited', extra: { userId?: string | null; status?: number; flag?: string | null } = {}): void {
  const row = rowFor(request, kind, extra);
  try {
    after(() => writeLog(row));
  } catch {
    void writeLog(row);
  }
}
