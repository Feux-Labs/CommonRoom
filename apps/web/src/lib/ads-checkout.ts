import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { initializeTransaction } from '@/lib/payments/paystack';

/** Starts a Paystack checkout for an ad campaign and records the pending payment. The amount comes from the server, never the browser. */
export async function startAdCheckout(request: Request, userId: string, email: string, adId: string, amountKobo: number) {
  const reference = `cr_${randomUUID().replaceAll('-', '')}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const checkout = await initializeTransaction({
    email, amountKobo, reference, callbackUrl: `${origin}/payments/return`, metadata: { product: 'ad_campaign', user_id: userId, ad_id: adId },
  });
  await prisma.$executeRaw`
    insert into public.payments (user_id, product, product_ref, amount_kobo, reference)
    values (${userId}::uuid, 'ad_campaign', ${adId}, ${amountKobo}, ${reference})`;
  return { authorizationUrl: checkout.authorizationUrl, reference };
}
