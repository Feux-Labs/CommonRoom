import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const n = (value: unknown) => Number(value ?? 0);
const HOURS: Record<string, number> = { '1h': 1, '24h': 24, '7d': 168 };

type LogRow = { ts: Date; kind: string; method: string | null; path: string | null; query: string | null; ip: string | null; ua: string | null; country: string | null; user_id: string | null; status: number | null; flag: string | null };

const shape = (row: LogRow) => ({
  at: row.ts.toISOString(), kind: row.kind, method: row.method, path: row.path, query: row.query, ip: row.ip, userAgent: row.ua, country: row.country, userId: row.user_id, status: row.status, flag: row.flag,
});

/**
 * GET /api/v1/admin/security?window=1h|24h|7d&q=: what people are calling and who looks like they are attacking.
 * "attack:" rows match a known attack pattern; "script:" rows are curl, scripts and tools that are not a normal browser.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'security');
  if (!isAdminAuthenticated(auth)) return auth;
  const params = new URL(request.url).searchParams;
  const hours = HOURS[params.get('window') ?? '24h'] ?? 24;
  const q = (params.get('q') ?? '').trim().slice(0, 80);
  const like = `%${q.replace(/[%_\\]/g, '')}%`;

  const [summary, endpoints, ips, attacks, scripts, authFailed, denied, recent] = await Promise.all([
    prisma.$queryRaw<Array<{ requests: bigint; ips: bigint; attacks: bigint; scripts: bigint; auth_failed: bigint; denied: bigint; limited: bigint }>>`
      select count(*) filter (where kind = 'request') as requests, count(distinct ip) as ips,
        count(*) filter (where flag like 'attack:%') as attacks, count(*) filter (where flag like 'script:%') as scripts,
        count(*) filter (where kind = 'auth_failed') as auth_failed, count(*) filter (where kind = 'admin_denied') as denied, count(*) filter (where kind = 'rate_limited') as limited
      from public.request_log where ts > now() - make_interval(hours => ${hours}::int)`,
    prisma.$queryRaw<Array<{ method: string; path: string; calls: bigint; ips: bigint }>>`
      select method, regexp_replace(regexp_replace(path, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'g'), '/inbox/links/[^/]+', '/inbox/links/:token') as path,
        count(*) as calls, count(distinct ip) as ips
      from public.request_log where kind = 'request' and ts > now() - make_interval(hours => ${hours}::int) and path like '/api/%' group by 1, 2 order by calls desc limit 25`,
    prisma.$queryRaw<Array<{ ip: string; calls: bigint; country: string | null; flagged: bigint; failed: bigint }>>`
      select ip, count(*) as calls, max(country) as country, count(*) filter (where flag is not null) as flagged, count(*) filter (where kind in ('auth_failed', 'admin_denied')) as failed
      from public.request_log where ip is not null and ts > now() - make_interval(hours => ${hours}::int) group by ip order by calls desc limit 15`,
    prisma.$queryRaw<LogRow[]>`select ts, kind, method, path, query, ip, ua, country, user_id::text as user_id, status, flag from public.request_log where flag like 'attack:%' and ts > now() - make_interval(hours => ${hours}::int) order by ts desc limit 100`,
    prisma.$queryRaw<Array<{ flag: string; ip: string | null; ua: string | null; calls: bigint; last_path: string | null }>>`
      select flag, ip, max(ua) as ua, count(*) as calls, (array_agg(path order by ts desc))[1] as last_path
      from public.request_log where flag like 'script:%' and ts > now() - make_interval(hours => ${hours}::int) group by flag, ip order by calls desc limit 30`,
    prisma.$queryRaw<Array<{ ip: string | null; calls: bigint; paths: string | null }>>`
      select ip, count(*) as calls, string_agg(distinct path, ', ') as paths from public.request_log where kind = 'auth_failed' and ts > now() - make_interval(hours => ${hours}::int) group by ip order by calls desc limit 15`,
    prisma.$queryRaw<LogRow[]>`select ts, kind, method, path, query, ip, ua, country, user_id::text as user_id, status, flag from public.request_log where kind = 'admin_denied' and ts > now() - make_interval(hours => ${hours}::int) order by ts desc limit 50`,
    prisma.$queryRaw<LogRow[]>`
      select ts, kind, method, path, query, ip, ua, country, user_id::text as user_id, status, flag from public.request_log
      where ts > now() - make_interval(hours => ${hours}::int) and (${q} = '' or path ilike ${like} or query ilike ${like} or ip ilike ${like} or user_id::text ilike ${like} or ua ilike ${like})
      order by ts desc limit 100`,
  ]);

  const s = summary[0];
  return apiSuccess({
    window: params.get('window') ?? '24h',
    summary: { requests: n(s?.requests), distinctIps: n(s?.ips), attackAttempts: n(s?.attacks), scriptRequests: n(s?.scripts), failedSignIns: n(s?.auth_failed), staffDenied: n(s?.denied), rateLimited: n(s?.limited) },
    topEndpoints: endpoints.map((row) => ({ method: row.method, path: row.path, calls: n(row.calls), ips: n(row.ips) })),
    topIps: ips.map((row) => ({ ip: row.ip, calls: n(row.calls), country: row.country, flagged: n(row.flagged), failed: n(row.failed) })),
    attacks: attacks.map(shape),
    scripts: scripts.map((row) => ({ flag: row.flag, ip: row.ip, userAgent: row.ua, calls: n(row.calls), lastPath: row.last_path })),
    failedAuth: authFailed.map((row) => ({ ip: row.ip, calls: n(row.calls), paths: row.paths })),
    staffDenied: denied.map(shape),
    recent: recent.map(shape),
  });
}
