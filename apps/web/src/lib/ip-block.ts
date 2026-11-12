import { prisma } from '@/lib/prisma';
import { alertStaff } from '@/lib/staff-alerts';

/**
 * Blocking attackers. The proxy asks isBlocked() for every request; the list is kept in memory and refreshed every 20 seconds,
 * so a block takes effect within about 20 seconds and checking costs almost nothing.
 */
let cache: { ips: Set<string>; at: number } = { ips: new Set(), at: 0 };
const REFRESH_MS = 5_000;

export const IP_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]{3,45}$/i;

async function refresh(): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<Array<{ ip: string }>>`select ip from public.blocked_ips where expires_at is null or expires_at > now()`;
    cache = { ips: new Set(rows.map((row) => row.ip)), at: Date.now() };
  } catch {
    // Keep the old list; a database hiccup must not open or close the door by itself.
    cache = { ips: cache.ips, at: Date.now() };
  }
}

export async function isBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  if (Date.now() - cache.at > REFRESH_MS) await refresh();
  return cache.ips.has(ip);
}

/** Makes a block take effect on this server straight away (other servers pick it up within 5 seconds). */
export function forgetBlockCache(): void {
  cache = { ips: cache.ips, at: 0 };
}

const AUTO_ATTACKS = 5; // attack-looking requests...
const AUTO_WINDOW = '10 minutes'; // ...within this time
const AUTO_HOURS = 24;

/**
 * Called after an attack-looking request is logged. Five of them from one address in ten minutes blocks that address for a day
 * and tells the staff. An address that has recently been used by staff is never blocked automatically, so a mistake can never lock the owner out.
 */
export async function autoBlockIfNeeded(ip: string | null, flag: string | null): Promise<void> {
  if (!ip || !flag || !flag.startsWith('attack:') || !IP_PATTERN.test(ip)) return;
  try {
    const recent = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.request_log where ip = ${ip} and flag like 'attack:%' and ts > now() - ${AUTO_WINDOW}::interval`;
    if (Number(recent[0]?.n ?? 0) < AUTO_ATTACKS) return;
    const staff = await prisma.$queryRaw<Array<{ n: bigint }>>`
      select count(*) as n from public.request_log l join public.admin_roles r on r.user_id = l.user_id where l.ip = ${ip} and l.ts > now() - interval '7 days'`;
    if (Number(staff[0]?.n ?? 0) > 0) return;
    const added = await prisma.$queryRaw<Array<{ ip: string }>>`
      insert into public.blocked_ips (ip, reason, auto, expires_at)
      values (${ip}, ${`Automatic: ${AUTO_ATTACKS}+ attack-looking requests in ${AUTO_WINDOW} (${flag})`}, true, now() + make_interval(hours => ${AUTO_HOURS}::int))
      on conflict (ip) do nothing returning ip`;
    if (added.length > 0) {
      forgetBlockCache();
      await alertStaff('An IP address was blocked automatically', `${ip} sent ${AUTO_ATTACKS}+ attack-looking requests in ${AUTO_WINDOW} and is blocked for ${AUTO_HOURS} hours. See the Security tab.`, '/admin');
    }
  } catch {
    // Never let monitoring break a request.
  }
}
