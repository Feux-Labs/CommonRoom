import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { startAdCheckout } from '@/lib/ads-checkout';
import { PaymentsNotConfiguredError } from '@/lib/payments/paystack';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH /api/v1/ads/campaigns/[id] { status: "paused" | "active" }: pause or resume your own running ad. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!uuid.test(id) || !isRecord(body) || (body.status !== 'paused' && body.status !== 'active')) return apiError('invalid_input', 'Send a status of paused or active.', 400);
  // An ad that a moderator removed after a report cannot be switched back on by its owner.
  const removed = await prisma.$queryRaw<Array<{ removed: boolean }>>`select exists (select 1 from public.content_reports r where r.target_kind = 'ad' and r.target_id = ${id}::uuid and r.status = 'actioned') as removed`;
  if (removed[0]?.removed) return apiError('ad_removed', 'This ad was removed after a report.', 409);
  const updated = await prisma.$executeRaw`
    update public.ads set status = ${body.status}
    where id = ${id}::uuid and owner_id = ${auth.user.id}::uuid and status in ('active', 'paused') and ends_at is not null and ends_at > now()`;
  if (updated === 0) return apiError('not_found', 'That ad cannot be changed.', 404);
  return apiSuccess({ id, status: body.status });
}

/** POST /api/v1/ads/campaigns/[id]: pay for an ad that was created but not paid yet. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;
  if (!uuid.test(id) || !auth.user.email) return apiError('invalid_input', 'That ad cannot be paid for.', 400);
  const rows = await prisma.$queryRaw<Array<{ price_kobo: number }>>`select price_kobo from public.ads where id = ${id}::uuid and owner_id = ${auth.user.id}::uuid and status = 'pending_payment'`;
  if (!rows[0]) return apiError('not_found', 'That ad is not waiting for payment.', 404);
  try {
    const checkout = await startAdCheckout(request, auth.user.id, auth.user.email, id, rows[0].price_kobo);
    return apiSuccess({ authorizationUrl: checkout.authorizationUrl, reference: checkout.reference });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    return apiError('checkout_failed', 'We could not start the payment. Try again.', 502);
  }
}
