import { apiSuccess } from '@/lib/supabase-server';
import { AD_DURATIONS, adPriceKobo, FREE_AD_DAYS } from '@/lib/ads';

/** GET /api/v1/ads/pricing: what a campaign costs. The price lives on the server so the screen always shows the real amount. */
export async function GET() {
  return apiSuccess({ options: AD_DURATIONS.map((days) => ({ days, priceNaira: adPriceKobo(days) / 100 })), freeAdDays: FREE_AD_DAYS });
}
