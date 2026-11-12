import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

function parseSubscription(body: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!isRecord(body) || typeof body.endpoint !== 'string' || !isRecord(body.keys)) return null;
  const { p256dh, auth } = body.keys;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (!/^https?:\/\/[^\s]{10,1100}$/.test(body.endpoint) || p256dh.length < 20 || p256dh.length > 200 || auth.length < 8 || auth.length > 100) return null;
  return { endpoint: body.endpoint, p256dh, auth };
}

/** POST /api/v1/push/subscribe { endpoint, keys }: this device wants alerts. Guests can too (for replies to messages they sent). */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const sub = parseSubscription(await parseJson(request));
  if (!sub) return apiError('invalid_subscription', 'That device could not be registered for alerts.', 422);
  // A device belongs to whoever is signed in on it now.
  await prisma.$executeRaw`
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${auth.user.id}::uuid, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${(request.headers.get('user-agent') ?? '').slice(0, 200)})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`;
  return apiSuccess({ subscribed: true }, 201);
}

/** DELETE /api/v1/push/subscribe { endpoint }: stop alerts on this device. */
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.endpoint !== 'string') return apiError('invalid_subscription', 'Send the device endpoint.', 422);
  await prisma.$executeRaw`delete from public.push_subscriptions where endpoint = ${body.endpoint} and user_id = ${auth.user.id}::uuid`;
  return apiSuccess({ subscribed: false });
}
