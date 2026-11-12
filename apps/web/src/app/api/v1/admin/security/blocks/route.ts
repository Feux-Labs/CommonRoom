import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { clientIp } from '@/lib/request-log';
import { forgetBlockCache, IP_PATTERN } from '@/lib/ip-block';

type Row = { ip: string; reason: string; auto: boolean; blocked_at: Date; expires_at: Date | null };

/** GET /api/v1/admin/security/blocks: every address that is blocked right now. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'security');
  if (!isAdminAuthenticated(auth)) return auth;
  const rows = await prisma.$queryRaw<Row[]>`select ip, reason, auto, blocked_at, expires_at from public.blocked_ips where expires_at is null or expires_at > now() order by blocked_at desc limit 200`;
  return apiSuccess(rows.map((row) => ({ ip: row.ip, reason: row.reason, auto: row.auto, blockedAt: row.blocked_at.toISOString(), expiresAt: row.expires_at ? row.expires_at.toISOString() : null })));
}

/** POST /api/v1/admin/security/blocks { ip, hours?, reason? }: block an address (forever when no hours are given). */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'security');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  const ip = isRecord(body) && typeof body.ip === 'string' ? body.ip.trim() : '';
  const hours = isRecord(body) && body.hours !== undefined && body.hours !== null && body.hours !== '' ? Number(body.hours) : null;
  const reason = isRecord(body) && typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
  if (!IP_PATTERN.test(ip)) return apiError('invalid_ip', 'Enter a valid IP address.', 422);
  if (hours !== null && (!Number.isFinite(hours) || hours < 1 || hours > 24 * 365)) return apiError('invalid_hours', 'Hours must be between 1 and 8,760, or empty to block for good.', 422);
  if (ip === clientIp(request.headers)) return apiError('own_ip', 'That is the address you are using right now. Blocking it would lock you out.', 409);
  await prisma.$executeRaw`
    insert into public.blocked_ips (ip, reason, auto, blocked_by, expires_at)
    values (${ip}, ${reason || 'Blocked by staff'}, false, ${auth.user.id}::uuid, ${hours === null ? null : new Date(Date.now() + hours * 3_600_000)})
    on conflict (ip) do update set reason = excluded.reason, auto = false, blocked_by = excluded.blocked_by, blocked_at = now(), expires_at = excluded.expires_at`;
  forgetBlockCache();
  return apiSuccess({ ip, blocked: true }, 201);
}

/** DELETE /api/v1/admin/security/blocks { ip }: let an address back in. */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request, 'security');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.ip !== 'string') return apiError('invalid_ip', 'Send the address to unblock.', 422);
  await prisma.$executeRaw`delete from public.blocked_ips where ip = ${body.ip.trim()}`;
  forgetBlockCache();
  return apiSuccess({ ip: body.ip, blocked: false });
}
