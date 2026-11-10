/**
 * What can be bought, and for how much. The server decides the price: the browser only names the product.
 * Prices are placeholders the owner has not decided yet (Pro price is still open in the product plan): change
 * them here or with the env variables, in naira.
 */
export type ProductId = 'pro_month' | 'ultimate_pass';

function naira(envName: string, fallback: number): number {
  const parsed = Number(process.env[envName]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function productPriceKobo(product: ProductId): number {
  switch (product) {
    case 'pro_month': return naira('PRICE_PRO_MONTH_NGN', 1500) * 100;
    case 'ultimate_pass': return naira('PRICE_ULTIMATE_PASS_NGN', 5000) * 100;
  }
}

export function isProductId(value: unknown): value is ProductId {
  return value === 'pro_month' || value === 'ultimate_pass';
}
