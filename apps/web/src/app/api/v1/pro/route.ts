import { apiSuccess } from '@/lib/supabase-server';
import { productPriceKobo } from '@/lib/payments/catalog';

/** GET /api/v1/pro: what Pro costs. The price lives on the server, so the screen always shows the real amount. */
export async function GET() {
  return apiSuccess({ product: 'pro_month', priceNaira: productPriceKobo('pro_month') / 100, days: 30 });
}
