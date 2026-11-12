import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const n = (value: unknown) => Number(value ?? 0);
const RANGES: Record<string, string> = { today: '1 day', week: '7 days', month: '30 days', all: '100 years' };

type Count = { label: string | null; people: bigint };

/**
 * GET /api/v1/admin/stats?range=today|week|month|all: the numbers for the dashboard.
 * Visitors are everyone who ever opened the app (guests included). Active means they opened it in the period.
 * Revenue is money Paystack confirmed. Demographics come from the request (country, city, device), never from a profile.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'analytics');
  if (!isAdminAuthenticated(auth)) return auth;
  const range = new URL(request.url).searchParams.get('range') ?? 'week';
  const span = RANGES[range] ?? RANGES.week;

  const [people, now, daily, signups, revenue, revenueDaily, byProduct, countries, cities, devices, systems, browsers, sources, signupsTotal] = await Promise.all([
    prisma.$queryRaw<Array<{ visitors: bigint; guests: bigint; members: bigint; today: bigint; week: bigint; month: bigint; ranged: bigint; ranged_members: bigint; ranged_guests: bigint }>>`
      select count(distinct user_id) as visitors,
        count(distinct user_id) filter (where is_anonymous) as guests,
        count(distinct user_id) filter (where not is_anonymous) as members,
        count(distinct user_id) filter (where created_at > now() - interval '1 day') as today,
        count(distinct user_id) filter (where created_at > now() - interval '7 days') as week,
        count(distinct user_id) filter (where created_at > now() - interval '30 days') as month,
        count(distinct user_id) filter (where created_at > now() - ${span}::interval) as ranged,
        count(distinct user_id) filter (where created_at > now() - ${span}::interval and not is_anonymous) as ranged_members,
        count(distinct user_id) filter (where created_at > now() - ${span}::interval and is_anonymous) as ranged_guests
      from public.app_events where event = 'app_open'`,
    // Active right now: people (guests included) whose app made a request in the last 5 minutes.
    prisma.$queryRaw<Array<{ total: bigint; members: bigint }>>`
      select count(distinct r.user_id) as total, count(distinct r.user_id) filter (where not coalesce(u.is_anonymous, true)) as members
      from public.request_log r left join auth.users u on u.id = r.user_id
      where r.user_id is not null and r.ts > now() - interval '5 minutes' and r.path not like '/api/v1/admin%'`,
    prisma.$queryRaw<Array<{ day: Date; active: bigint; fresh: bigint }>>`
      with days as (select generate_series((now() at time zone 'Africa/Lagos')::date - 29, (now() at time zone 'Africa/Lagos')::date, interval '1 day')::date as day),
      active as (select (created_at at time zone 'Africa/Lagos')::date as day, count(distinct user_id) as n from public.app_events where event = 'app_open' and created_at > now() - interval '31 days' group by 1),
      fresh as (select first_day as day, count(*) as n from (select user_id, min((created_at at time zone 'Africa/Lagos')::date) as first_day from public.app_events where event = 'app_open' group by user_id) f group by 1)
      select d.day, coalesce(a.n, 0) as active, coalesce(f.n, 0) as fresh from days d left join active a on a.day = d.day left join fresh f on f.day = d.day order by d.day`,
    prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
      select (created_at at time zone 'Africa/Lagos')::date as day, count(*) as n from public.profiles where created_at > now() - interval '31 days' group by 1 order by 1`,
    prisma.$queryRaw<Array<{ total: bigint | null; ranged: bigint | null; today: bigint | null; week: bigint | null; month: bigint | null; payments: bigint }>>`
      select coalesce(sum(amount_kobo), 0) as total,
        coalesce(sum(amount_kobo) filter (where paid_at > now() - ${span}::interval), 0) as ranged,
        coalesce(sum(amount_kobo) filter (where paid_at > now() - interval '1 day'), 0) as today,
        coalesce(sum(amount_kobo) filter (where paid_at > now() - interval '7 days'), 0) as week,
        coalesce(sum(amount_kobo) filter (where paid_at > now() - interval '30 days'), 0) as month,
        count(*) as payments
      from public.payments where status = 'success'`,
    prisma.$queryRaw<Array<{ day: Date; kobo: bigint }>>`
      with days as (select generate_series((now() at time zone 'Africa/Lagos')::date - 29, (now() at time zone 'Africa/Lagos')::date, interval '1 day')::date as day)
      select d.day, coalesce(sum(p.amount_kobo), 0) as kobo from days d
      left join public.payments p on p.status = 'success' and (p.paid_at at time zone 'Africa/Lagos')::date = d.day group by d.day order by d.day`,
    prisma.$queryRaw<Array<{ product: string; kobo: bigint; count: bigint }>>`
      select product, sum(amount_kobo) as kobo, count(*) as count from public.payments where status = 'success' and paid_at > now() - ${span}::interval group by product order by 2 desc`,
    prisma.$queryRaw<Count[]>`select coalesce(country, 'Unknown') as label, count(*) as people from public.visitor_profiles where last_seen > now() - ${span}::interval group by 1 order by 2 desc limit 10`,
    prisma.$queryRaw<Count[]>`select coalesce(city, 'Unknown') as label, count(*) as people from public.visitor_profiles where last_seen > now() - ${span}::interval group by 1 order by 2 desc limit 10`,
    prisma.$queryRaw<Count[]>`select coalesce(device, 'Unknown') as label, count(*) as people from public.visitor_profiles where last_seen > now() - ${span}::interval group by 1 order by 2 desc`,
    prisma.$queryRaw<Count[]>`select coalesce(os, 'Unknown') as label, count(*) as people from public.visitor_profiles where last_seen > now() - ${span}::interval group by 1 order by 2 desc`,
    prisma.$queryRaw<Count[]>`select coalesce(browser, 'Unknown') as label, count(*) as people from public.visitor_profiles where last_seen > now() - ${span}::interval group by 1 order by 2 desc`,
    prisma.$queryRaw<Count[]>`select source as label, count(*) as people from public.acquisition_sources group by 1 order by 2 desc limit 10`,
    prisma.$queryRaw<Array<{ members: bigint }>>`select count(*) as members from public.profiles`,
  ]);

  const p = people[0];
  const r = revenue[0];
  const list = (rows: Count[]) => rows.map((row) => ({ label: row.label ?? 'Unknown', people: n(row.people) }));
  const signupByDay = new Map(signups.map((row) => [row.day.toISOString().slice(0, 10), n(row.n)]));
  return apiSuccess({
    range,
    users: {
      allTimeVisitors: n(p?.visitors), guests: n(p?.guests), membersSeen: n(p?.members), registered: n(signupsTotal[0]?.members),
      activeNow: n(now[0]?.total), activeNowMembers: n(now[0]?.members), uniqueInRange: n(p?.ranged), uniqueMembersInRange: n(p?.ranged_members), uniqueGuestsInRange: n(p?.ranged_guests),
      activeToday: n(p?.today), activeThisWeek: n(p?.week), activeThisMonth: n(p?.month), activeInRange: n(p?.ranged),
    },
    daily: daily.map((row) => ({ day: row.day.toISOString().slice(0, 10), active: n(row.active), newVisitors: n(row.fresh), newMembers: signupByDay.get(row.day.toISOString().slice(0, 10)) ?? 0 })),
    revenue: {
      totalNaira: n(r?.total) / 100, inRangeNaira: n(r?.ranged) / 100, todayNaira: n(r?.today) / 100, weekNaira: n(r?.week) / 100, monthNaira: n(r?.month) / 100, payments: n(r?.payments),
      daily: revenueDaily.map((row) => ({ day: row.day.toISOString().slice(0, 10), naira: n(row.kobo) / 100 })),
      byProduct: byProduct.map((row) => ({ product: row.product, naira: n(row.kobo) / 100, count: n(row.count) })),
    },
    demographics: { countries: list(countries), cities: list(cities), devices: list(devices), systems: list(systems), browsers: list(browsers), sources: list(sources) },
  });
}
