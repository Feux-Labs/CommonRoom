import { NextResponse } from 'next/server';
import { isValidWebhookSignature } from '@/lib/payments/paystack';
import { settlePayment } from '@/lib/payments/settle';

/**
 * Paystack tells us about a charge here, even if the buyer closed the tab before returning to the app.
 * Register this address in the Paystack dashboard (Settings > API Keys & Webhooks): https://<your domain>/api/paystack/webhook
 * The body is only used to learn WHICH payment to check: the outcome is always confirmed with Paystack directly.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 100_000 || !isValidWebhookSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let reference: unknown;
  try {
    const event = JSON.parse(rawBody) as { event?: unknown; data?: { reference?: unknown } };
    if (event.event === 'charge.success') reference = event.data?.reference;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (typeof reference === 'string' && /^cr_[a-f0-9]{20,}$/.test(reference)) {
    try {
      await settlePayment(reference);
    } catch (error) {
      // A non-2xx makes Paystack retry later, which is what we want if the check failed.
      console.error('Webhook payment check failed.', error instanceof Error ? error.message : 'unknown');
      return NextResponse.json({ error: 'try_again' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
