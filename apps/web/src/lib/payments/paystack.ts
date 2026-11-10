import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.paystack.co';

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super('Payments are not set up yet.');
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError();
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!response.ok || !body?.status) throw new Error(body?.message ?? `Paystack request failed (${response.status}).`);
  return body.data;
}

/** Starts a checkout. Amounts are in kobo (₦1 = 100 kobo). The returned URL is where the buyer pays. */
export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string | number>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const data = await call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  return { authorizationUrl: data.authorization_url, reference: data.reference };
}

export type VerifiedTransaction = { status: string; amount: number; currency: string; id: number };

/** Asks Paystack what really happened to a charge. This, not a browser redirect or webhook body, is the source of truth. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = await call<{ status: string; amount: number; currency: string; id: number }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return { status: data.status, amount: data.amount, currency: data.currency, id: data.id };
}

/** Paystack signs each webhook with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null, key = process.env.PAYSTACK_SECRET_KEY): boolean {
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const given = Buffer.from(signature, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
