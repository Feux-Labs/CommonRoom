import { prisma } from '@/lib/prisma';
import { verifyTransaction, type VerifiedTransaction } from './paystack';

export type SettleResult = 'applied' | 'already' | 'pending' | 'failed' | 'unknown' | 'mismatch';

type PaymentRow = { amount_kobo: number; currency: string; status: string };

/**
 * Settles one payment by asking Paystack what happened (never by trusting a redirect or webhook body).
 * Safe to call any number of times, from the return page and the webhook at once: the database applies a payment once.
 * `verify` is injectable so the logic can be tested without calling Paystack.
 */
export async function settlePayment(reference: string, verify: (reference: string) => Promise<VerifiedTransaction> = verifyTransaction): Promise<SettleResult> {
  const rows = await prisma.$queryRaw<PaymentRow[]>`select amount_kobo, currency, status from public.payments where reference = ${reference}`;
  const payment = rows[0];
  if (!payment) return 'unknown';
  if (payment.status === 'success') return 'already';

  const charge = await verify(reference);
  if (charge.status === 'success') {
    // The amount that was actually paid must equal the price we stored. Anything else is not credited.
    if (charge.amount !== payment.amount_kobo || charge.currency !== payment.currency) return 'mismatch';
    const result = await prisma.$queryRaw<Array<{ r: string }>>`select public.apply_payment_success(${reference}, ${String(charge.id)}) as r`;
    return result[0]?.r === 'already' ? 'already' : 'applied';
  }
  if (charge.status === 'failed' || charge.status === 'abandoned') {
    await prisma.$executeRaw`select public.mark_payment_unsuccessful(${reference}, ${charge.status})`;
    return 'failed';
  }
  return 'pending';
}
