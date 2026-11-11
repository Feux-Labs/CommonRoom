import { institutions } from '@/lib/institutions';

/** Campaign prices in kobo (₦1 = 100 kobo). Change them here or with AD_PRICE_1_DAY_NGN, AD_PRICE_5_DAYS_NGN, AD_PRICE_7_DAYS_NGN. */
export const AD_DURATIONS = [1, 5, 7] as const;
export type AdDays = (typeof AD_DURATIONS)[number];
export const FREE_AD_DAYS = 2;

function naira(envName: string, fallback: number): number {
  const parsed = Number(process.env[envName]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function adPriceKobo(days: AdDays): number {
  switch (days) {
    case 1: return naira('AD_PRICE_1_DAY_NGN', 1000) * 100;
    case 5: return naira('AD_PRICE_5_DAYS_NGN', 3000) * 100;
    case 7: return naira('AD_PRICE_7_DAYS_NGN', 4000) * 100;
  }
}

export function isAdDays(value: unknown): value is AdDays {
  return value === 1 || value === 5 || value === 7;
}

export type AdObjective = 'website' | 'whatsapp' | 'call';
export const OBJECTIVES: AdObjective[] = ['website', 'whatsapp', 'call'];
export const CTA_LABELS: Record<AdObjective, string> = { website: 'Visit website', whatsapp: 'Chat on WhatsApp', call: 'Call now' };

/** Turns a Nigerian number written any usual way (0803…, 803…, 234803…, +234 803…) into +234803…. Null when it is not a phone number. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/[^\d]/g, '');
  let international: string;
  if (raw.startsWith('+')) international = digits;
  else if (digits.startsWith('234') && digits.length >= 12) international = digits;
  else if (digits.startsWith('0') && digits.length === 11) international = `234${digits.slice(1)}`;
  else if (digits.length === 10 && /^[789]/.test(digits)) international = `234${digits}`;
  else return null;
  return /^\d{8,15}$/.test(international) ? `+${international}` : null;
}

const WHATSAPP_HOSTS = ['wa.me', 'wa.link', 'api.whatsapp.com', 'chat.whatsapp.com'];

function safeHttps(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    return url;
  } catch {
    return null;
  }
}

/** What the "contact" box means for each goal. Returns the link the button opens, or null when the input is not valid. */
export function buildContact(objective: AdObjective, input: string): { linkUrl: string; ctaLabel: string } | null {
  const text = input.trim();
  if (!text || text.length > 300) return null;
  if (objective === 'website') {
    const url = safeHttps(text);
    return url ? { linkUrl: url.toString(), ctaLabel: CTA_LABELS.website } : null;
  }
  if (objective === 'call') {
    const phone = normalizePhone(text);
    return phone ? { linkUrl: `tel:${phone}`, ctaLabel: CTA_LABELS.call } : null;
  }
  // WhatsApp: a phone number, or a WhatsApp link.
  const phone = normalizePhone(text);
  if (phone) return { linkUrl: `https://wa.me/${phone.slice(1)}`, ctaLabel: CTA_LABELS.whatsapp };
  const url = safeHttps(text);
  return url && WHATSAPP_HOSTS.includes(url.hostname.toLowerCase()) ? { linkUrl: url.toString(), ctaLabel: CTA_LABELS.whatsapp } : null;
}

// ---- Where an ad can run ----
// Targets are keys like "school:Adekunle Ajasin University, Akungba", "town:Akungba", "state:Ondo State", "country:Nigeria".
function townOf(name: string): string | null {
  const index = name.lastIndexOf(',');
  return index > 0 ? name.slice(index + 1).trim() || null : null;
}

const SCHOOL_KEYS = new Set(institutions.map((item) => `school:${item.name}`));
const STATE_KEYS = new Set(institutions.map((item) => `state:${item.location}`));
const TOWN_KEYS = new Set(institutions.flatMap((item) => { const town = townOf(item.name); return town ? [`town:${town}`] : []; }));

export const MAX_TARGETS = 15;

export function isValidTarget(key: string): boolean {
  return key === 'country:Nigeria' || SCHOOL_KEYS.has(key) || STATE_KEYS.has(key) || TOWN_KEYS.has(key);
}

/** The places a viewer counts as being in, from their school. Everyone in Nigeria matches "country:Nigeria". */
export function viewerKeys(school: string | null | undefined): string[] {
  const keys = ['country:Nigeria'];
  if (!school) return keys;
  const match = institutions.find((item) => item.name === school);
  if (!match) return [...keys, `school:${school}`];
  keys.push(`state:${match.location}`, `school:${match.name}`);
  const town = townOf(match.name);
  if (town) keys.push(`town:${town}`);
  return keys;
}
