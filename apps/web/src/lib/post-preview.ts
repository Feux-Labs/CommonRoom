import { prisma } from '@/lib/prisma';
import { mediaUrlFor } from '@/lib/media-url';

export type PostPreview = {
  body: string;
  theme: 'blue-hour' | 'soft-sky' | 'warm-glow' | 'rose-note';
  /** A photo that is safe to show in a preview (never one the author marked sensitive), or null. */
  photo: string | null;
  hasVideo: boolean;
};

const THEMES = ['blue-hour', 'soft-sky', 'warm-glow', 'rose-note'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a shared Anonymous post link should show: the person's own words and, when there is one, their photo. Nothing about who wrote it. */
export async function loadPostPreview(id: string): Promise<PostPreview | null> {
  if (!UUID.test(id)) return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ body: string; card_theme: string | null; media_items: unknown }>>`
      select body, card_theme, media_items from public.anonymous_posts where id = ${id}::uuid`;
    const row = rows[0];
    if (!row) return null;
    const items = Array.isArray(row.media_items) ? (row.media_items as Array<{ path?: string; mediaType?: string; sensitive?: boolean }>) : [];
    const photo = items.find((item) => item.mediaType === 'photo' && typeof item.path === 'string' && !item.sensitive);
    const theme = (THEMES as readonly string[]).includes(row.card_theme ?? '') ? (row.card_theme as PostPreview['theme']) : 'blue-hour';
    return { body: row.body, theme, photo: photo?.path ? mediaUrlFor(photo.path) || null : null, hasVideo: items.some((item) => item.mediaType === 'video') };
  } catch {
    return null;
  }
}

export function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}
