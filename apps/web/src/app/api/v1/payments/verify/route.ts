import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { PaymentsNotConfiguredError } from '@/lib/payments/paystack';
import { settlePayment } from '@/lib/payments/settle';

/** GET /api/v1/payments/verify?reference=...: used by the page buyers return to after paying. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const reference = new URL(request.url).searchParams.get('reference') ?? '';
  if (!/^cr_[a-f0-9]{20,}$/.test(reference)) return apiError('invalid_reference', 'That payment reference is not valid.', 400);

  // You can only settle your own payment.
  const own = await prisma.$queryRaw<Array<{ user_id: string }>>`select user_id from public.payments where reference = ${reference}`;
  if (own[0]?.user_id !== auth.user.id) return apiError('payment_not_found', 'We could not find that payment.', 404);

  try {
    const status = await settlePayment(reference);
    return apiSuccess({ status });
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    console.error('Payment could not be verified.', error instanceof Error ? error.message : 'unknown');
    return apiError('verify_failed', 'We could not check that payment yet. Try again in a moment.', 502);
  }
}
