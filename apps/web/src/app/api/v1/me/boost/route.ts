import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, requireRegisteredUser } from '@/lib/supabase-server';
import { requireAdult } from '@/lib/anonymous-api';
import { prisma } from '@/lib/prisma';
import { startCheckout } from '@/lib/payments/checkout';
import { PaymentsNotConfiguredError } from '@/lib/payments/paystack';

type Level = { points: number | string; next_at: number | null; boost_price_kobo: number | null; boost_available_at: string | null; level_name: string; step: number };

async function quote(auth: { supabase: Parameters<typeof requireAdult>[0] }) {
  const { data, error } = await auth.supabase.rpc('my_level');
  if (error) return null;
  return (Array.isArray(data) ? data[0] : data) as Level | null;
}

/** GET /api/v1/me/boost: what one step up costs and when you can next buy one. Nothing random: the price is shown before you pay. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;
  const level = await quote(auth);
  if (!level) return apiError('level_failed', 'Your rank could not be loaded.', 500);
  return apiSuccess({
    available: level.next_at !== null && !level.boost_available_at,
    atSummit: level.next_at === null,
    from: Number(level.points), to: level.next_at, priceNaira: level.boost_price_kobo ? level.boost_price_kobo / 100 : null, nextAvailableAt: level.boost_available_at,
  });
}

/** POST /api/v1/me/boost: pay for one step up. At most one every 24 hours. You must be 18 or older. */
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
  if (level.boost_available_at) return apiError('boost_cooldown', 'You can climb one step every 24 hours. Try again later.', 409);
  const pending = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.payments where user_id = ${auth.user.id}::uuid and product = 'rank_boost' and created_at > now() - interval '24 hours' and status in ('pending', 'success')`;
  if (Number(pending[0]?.n ?? 0) > 0) return apiError('boost_cooldown', 'You already have a boost in progress or bought one in the last 24 hours.', 409);

  try {
    const checkout = await startCheckout(request, { userId: auth.user.id, email: auth.user.email, product: 'rank_boost', productRef: `${Number(level.points)}:${level.next_at}`, amountKobo: level.boost_price_kobo });
    return apiSuccess({ authorizationUrl: checkout.authorizationUrl, reference: checkout.reference }, 201);
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    return apiError('checkout_failed', 'We could not start the payment. Try again.', 502);
  }
}
