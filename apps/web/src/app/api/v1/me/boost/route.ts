import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';
import { requireAdult } from '@/lib/anonymous-api';
import { prisma } from '@/lib/prisma';
import { startCheckout } from '@/lib/payments/checkout';
import { PaymentsNotConfiguredError } from '@/lib/payments/paystack';

type Level = { points: number | string; next_at: number | null; boost_price_kobo: number | null; boost_available_at: string | null; level_name: string; step: number };

const DAILY_BOOSTS = 5;

/** Boosts started in the last 24 hours (paid or waiting for payment). Five a day are allowed; the next one opens 24 hours after the oldest of the five. */
async function recentBoosts(userId: string): Promise<{ count: number; nextAt: string | null }> {
  const rows = await prisma.$queryRaw<Array<{ at: Date }>>`select coalesce(paid_at, created_at) as at from public.payments where user_id = ${userId}::uuid and product = 'rank_boost' and status in ('pending', 'success') and created_at > now() - interval '24 hours' order by created_at asc`;
  return { count: rows.length, nextAt: rows.length >= DAILY_BOOSTS ? new Date(new Date(rows[rows.length - DAILY_BOOSTS].at).getTime() + 24 * 3600 * 1000).toISOString() : null };
}

async function quote(auth: { supabase: Parameters<typeof requireAdult>[0] }) {
  const { data, error } = await auth.supabase.rpc('my_level');
  if (error) return null;
  return (Array.isArray(data) ? data[0] : data) as Level | null;
}

/** GET /api/v1/me/boost: what one star up costs and when you can next buy one (five a day). Nothing random: the price is shown before you pay. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;
  const level = await quote(auth);
  if (!level) return apiError('level_failed', 'Your rank could not be loaded.', 500);
  const recent = await recentBoosts(auth.user.id);
  return apiSuccess({
    available: level.next_at !== null && !recent.nextAt,
    atSummit: level.next_at === null,
    from: Number(level.points), to: level.next_at, priceNaira: level.boost_price_kobo ? level.boost_price_kobo / 100 : null, nextAvailableAt: recent.nextAt, usedToday: recent.count, perDay: DAILY_BOOSTS,
  });
}

/** POST /api/v1/me/boost: pay for one star up. At most five in any 24 hours. You must be 18 or older. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;
  const refused = await requireAdult(auth.supabase);
  if (refused) return refused;
  if (!auth.user.email) return apiError('email_required', 'Add an email to your account to pay.', 422);

  const level = await quote(auth);
  if (!level || level.next_at === null || !level.boost_price_kobo) return apiError('at_summit', 'You are already at the very top.', 409);
  const recent = await recentBoosts(auth.user.id);
  if (recent.nextAt) return apiError('boost_cooldown', `You can climb up to ${DAILY_BOOSTS} times a day. Try again later.`, 409);
  try {
    const checkout = await startCheckout(request, { userId: auth.user.id, email: auth.user.email, product: 'rank_boost', productRef: `${Number(level.points)}:${level.next_at}`, amountKobo: level.boost_price_kobo });
    return apiSuccess({ authorizationUrl: checkout.authorizationUrl, reference: checkout.reference }, 201);
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    return apiError('checkout_failed', 'We could not start the payment. Try again.', 502);
  }
}
