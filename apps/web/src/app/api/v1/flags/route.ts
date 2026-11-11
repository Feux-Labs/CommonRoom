import { apiSuccess } from '@/lib/supabase-server';
import { readFlags } from '@/lib/flags';

/** GET /api/v1/flags: the public on/off switches the app reads at start-up. No account needed. */
export async function GET() {
  const response = apiSuccess({ flags: await readFlags() });
  response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=30');
  return response;
}
