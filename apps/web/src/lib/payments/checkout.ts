import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { initializeTransaction } from '@/lib/payments/paystack';

/** Starts a Paystack checkout for any product and records the pending payment. The amount always comes from the server. */
export async function startCheckout(request: Request, input: { userId: string; email: string; product: string; productRef: string | null; amountKobo: number }) {
  const reference = `cr_${randomUUID().replaceAll('-', '')}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const checkout = await initializeTransaction({
    email: input.email, amountKobo: input.amountKobo, reference, callbackUrl: `${origin}/payments/return`,
    metadata: { product: input.product, user_id: input.userId, ...(input.productRef ? { ref: input.productRef } : {}) },
  });
  await prisma.$executeRaw`
    insert into public.payments (user_id, product, product_ref, amount_kobo, reference)
    values (${input.userId}::uuid, ${input.product}, ${input.productRef}, ${input.amountKobo}, ${reference})`;
  return { authorizationUrl: checkout.authorizationUrl, reference };
}
