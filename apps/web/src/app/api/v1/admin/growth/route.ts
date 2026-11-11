import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const n = (value: unknown) => Number(value ?? 0);

/** GET /api/v1/admin/growth: active people, guests versus members, where people come from, and the sign-up funnel. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  const [active, split, sources, funnel] = await Promise.all([
    prisma.$queryRaw<Array<{ dau: bigint; wau: bigint; mau: bigint }>>`
      select
        count(distinct user_id) filter (where created_at > now() - interval '1 day') as dau,
        count(distinct user_id) filter (where created_at > now() - interval '7 days') as wau,
        count(distinct user_id) filter (where created_at > now() - interval '30 days') as mau
      from public.app_events where event = 'app_open'`,
    prisma.$queryRaw<Array<{ guests: bigint; members: bigint }>>`
      select
        count(distinct user_id) filter (where is_anonymous) as guests,
        count(distinct user_id) filter (where not is_anonymous) as members
      from public.app_events where event = 'app_open' and created_at > now() - interval '30 days'`,
    prisma.$queryRaw<Array<{ source: string; people: bigint }>>`
      select source, count(*) as people from public.acquisition_sources group by source order by people desc limit 10`,
    prisma.$queryRaw<Array<{ opened: bigint; confirmed: bigint; posted: bigint; members: bigint }>>`
      select
        (select count(distinct user_id) from public.app_events where event = 'app_open') as opened,
        (select count(*) from public.age_confirmations) as confirmed,
        (select count(distinct owner_id) from public.anonymous_post_owners) as posted,
        (select count(*) from public.profiles) as members`,
  ]);

  return apiSuccess({
    active: { dau: n(active[0]?.dau), wau: n(active[0]?.wau), mau: n(active[0]?.mau) },
    last30Days: { guests: n(split[0]?.guests), members: n(split[0]?.members) },
    sources: sources.map((row) => ({ source: row.source, people: n(row.people) })),
    funnel: { opened: n(funnel[0]?.opened), confirmed18: n(funnel[0]?.confirmed), postedAnonymously: n(funnel[0]?.posted), members: n(funnel[0]?.members) },
  });
}
