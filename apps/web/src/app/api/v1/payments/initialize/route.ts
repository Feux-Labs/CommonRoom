import { randomUUID } from 'node:crypto';
import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { isProductId, productPriceKobo } from '@/lib/payments/catalog';
import { initializeTransaction, PaymentsNotConfiguredError } from '@/lib/payments/paystack';

/** POST /api/v1/payments/initialize { product }: starts a Paystack checkout and returns where to send the buyer. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const notRegistered = requireRegisteredUser(auth);
  if (notRegistered) return notRegistered;

  const body = await parseJson(request);
  if (!isRecord(body) || !isProductId(body.product)) return apiError('invalid_body', 'Choose what you want to buy.', 400);
  const email = auth.user.email;
  if (!email) return apiError('email_required', 'Add an email to your account to pay.', 422);

  const amountKobo = productPriceKobo(body.product);
  const reference = `cr_${randomUUID().replaceAll('-', '')}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const checkout = await initializeTransaction({
      email,
      amountKobo,
      reference,
      callbackUrl: `${origin}/payments/return`,
      metadata: { product: body.product, user_id: auth.user.id },
    });
    // Only record the payment once Paystack has accepted it.
    await prisma.$executeRaw`
      insert into public.payments (user_id, product, amount_kobo, reference)
      values (${auth.user.id}::uuid, ${body.product}, ${amountKobo}, ${reference})`;
    return apiSuccess({ authorizationUrl: checkout.authorizationUrl, reference }, 201);
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) return apiError('payments_not_configured', 'Payments are not set up yet.', 503);
    console.error('Checkout could not be started.', error instanceof Error ? error.message : 'unknown');
    return apiError('checkout_failed', 'We could not start the payment. Try again.', 502);
  }
}
