import { prisma } from '@/lib/prisma';

export const FLAG_KEYS = ['anonymous_posting', 'anonymous_inbox', 'room_tab', 'market_tab', 'signin_nudge'] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

/** Every flag with its current value. A flag that is missing, or a database error, counts as ON so a hiccup never switches the app off. */
export async function readFlags(): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = Object.fromEntries(FLAG_KEYS.map((key) => [key, true]));
  try {
    const rows = await prisma.$queryRaw<Array<{ key: string; enabled: boolean }>>`select key, enabled from public.feature_flags`;
    for (const row of rows) flags[row.key] = row.enabled;
  } catch {
    // keep the defaults
  }
  return flags;
}

export async function isFlagEnabled(key: FlagKey): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`select enabled from public.feature_flags where key = ${key}`;
    return rows[0]?.enabled ?? true;
  } catch {
    return true;
  }
}
