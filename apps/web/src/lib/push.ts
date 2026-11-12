import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

/**
 * Push notifications (the "alert on my phone" kind). The server keeps one VAPID key pair for good in the database, so there is
 * nothing to set up. Payloads are encrypted for each device, and a device that has gone away is forgotten automatically.
 * Alerts say what happened, never who did it: "New anonymous message", not the sender.
 */
export type PushPayload = { title: string; body: string; url: string };
type Fetch = typeof fetch;

let keys: { publicKey: string; privateKey: string } | null = null;

export async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (keys) return keys;
  const read = () => prisma.$queryRaw<Array<{ key: string; value: string }>>`select key, value from public.admin_settings where key in ('vapid_public', 'vapid_private')`;
  let rows = await read();
  if (rows.length < 2) {
    const fresh = webpush.generateVAPIDKeys();
    await prisma.$executeRaw`insert into public.admin_settings (key, value) values ('vapid_public', ${fresh.publicKey}), ('vapid_private', ${fresh.privateKey}) on conflict (key) do nothing`;
    rows = await read(); // if two servers raced, both read the same winner
  }
  keys = { publicKey: rows.find((row) => row.key === 'vapid_public')!.value, privateKey: rows.find((row) => row.key === 'vapid_private')!.value };
  return keys;
}

function subject(): string {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return support ? `mailto:${support}` : process.env.NEXT_PUBLIC_SITE_URL || 'https://commonroom.feuxlabs.com.ng';
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Sends one alert to every device these people enabled. Returns how many were delivered. `fetchImpl` is for tests. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload, fetchImpl: Fetch = fetch): Promise<number> {
  if (userIds.length === 0) return 0;
  try {
    const subs = await prisma.$queryRaw<Sub[]>`select id::text as id, endpoint, p256dh, auth from public.push_subscriptions where user_id = any(${userIds}::uuid[])`;
    if (subs.length === 0) return 0;
    const { publicKey, privateKey } = await vapidKeys();
    let delivered = 0;
    await Promise.all(subs.map(async (sub) => {
      try {
        const details = webpush.generateRequestDetails(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { vapidDetails: { subject: subject(), publicKey, privateKey }, TTL: 3600, urgency: 'normal' },
        );
        const response = await fetchImpl(details.endpoint, { method: details.method, headers: details.headers as Record<string, string>, body: details.body as BodyInit, signal: AbortSignal.timeout(8000) });
        if (response.status === 404 || response.status === 410) {
          await prisma.$executeRaw`delete from public.push_subscriptions where id = ${sub.id}::uuid`;
        } else if (response.ok) {
          delivered += 1;
        }
      } catch {
        // One bad device must not stop the others.
      }
    }));
    return delivered;
  } catch {
    return 0;
  }
}
