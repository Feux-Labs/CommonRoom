import { apiError, apiSuccess } from '@/lib/supabase-server';
import { vapidKeys } from '@/lib/push';

/** GET /api/v1/push/key: the public key a browser needs to subscribe to alerts. Public by design. */
export async function GET() {
  try {
    return apiSuccess({ publicKey: (await vapidKeys()).publicKey });
  } catch {
    return apiError('push_unavailable', 'Alerts are not available right now.', 503);
  }
}
