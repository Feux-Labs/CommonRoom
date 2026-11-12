import { startCheckout } from '@/lib/payments/checkout';

/** Starts a Paystack checkout for an ad campaign. */
export async function startAdCheckout(request: Request, userId: string, email: string, adId: string, amountKobo: number) {
  return startCheckout(request, { userId, email, product: 'ad_campaign', productRef: adId, amountKobo });
}
