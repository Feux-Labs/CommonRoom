import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mediaBaseUrl } from '@/lib/media-url';
import { getObjectBytes } from '@/lib/r2';
import { isGeminiConfigured, scanTextWithGemini } from './gemini-scanner';
import { isScannerConfigured, mimeOfKey, scanMedia } from './scanner';

type ScanKind = 'image' | 'video';
const MAX_ATTEMPTS = 3;

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/** "https://media.example.com/anonymous/abc.jpg" -> "anonymous/abc.jpg" (only for our own media domain). */
export function mediaKeyFromUrl(url: string, base = mediaBaseUrl()): string | null {
  if (!base || !url.startsWith(`${base}/`)) return null;
  const key = decodeURIComponent(url.slice(base.length + 1).split('?')[0]);
  return key && !key.includes('..') ? key : null;
}

export function kindOfKey(key: string): ScanKind | null {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  return null;
}

/** Remembers that these files were published and need a look. Safe to call twice. */
async function enqueue(ownerId: string, keys: string[]): Promise<void> {
  for (const key of keys) {
    const kind = kindOfKey(key);
    if (!kind) continue;
    await prisma.$executeRaw`
      insert into public.media_scans (path, owner_id, kind) values (${key}, ${ownerId}::uuid, ${kind})
      on conflict (path) do nothing`;
  }
}

async function scanOne(key: string, kind: ScanKind): Promise<void> {
  try {
    const bytes = await getObjectBytes(key, kind === 'video' ? 4_000_000 : 8_000_000);
    if (!bytes) {
      await prisma.$executeRaw`update public.media_scans set attempts = attempts + 1, status = 'error' where path = ${key}`;
      return;
    }
    const { level, detail } = await scanMedia(bytes, kind, mimeOfKey(key));
    const detailJson = JSON.stringify(detail);
    if (level === 'clean') {
      await prisma.$executeRaw`update public.media_scans set status = 'clean', level = 'clean', detail = ${detailJson}::jsonb, scanned_at = now(), attempts = attempts + 1 where path = ${key}`;
      return;
    }
    await prisma.$executeRaw`update public.media_scans set status = 'flagged', level = ${level}, detail = ${detailJson}::jsonb, scanned_at = now(), attempts = attempts + 1 where path = ${key}`;
    // Flag only: a moderator is told and the author is warned. Nothing is hidden or deleted automatically.
    await prisma.$queryRaw`select public.apply_media_verdict(${key}, ${level})`;
  } catch (error) {
    console.error('Media scan failed.', error instanceof Error ? error.message : 'unknown');
    await prisma.$executeRaw`update public.media_scans set attempts = attempts + 1, status = 'error' where path = ${key}`;
  }
}

/** Scans specific files that were just published. */
export async function scanPublishedMedia(ownerId: string, keys: string[]): Promise<void> {
  await enqueue(ownerId, keys);
  if (!isScannerConfigured()) return;
  for (const key of keys) {
    const kind = kindOfKey(key);
    if (kind) await scanOne(key, kind);
  }
}

/** Runs after the response has been sent, so publishing is never slowed down by scanning. */
export function scheduleMediaScan(ownerId: string, keys: string[]): void {
  if (!keys.length) return;
  after(async () => {
    try {
      await scanPublishedMedia(ownerId, keys);
    } catch (error) {
      console.error('Media scan could not be scheduled.', error instanceof Error ? error.message : 'unknown');
    }
  });
}

/** Retries files that are still waiting or failed earlier (called by the scheduled job). */
export async function scanPending(limit = 20): Promise<{ checked: number; configured: boolean }> {
  if (!isScannerConfigured()) return { checked: 0, configured: false };
  const rows = await prisma.$queryRaw<Array<{ path: string; kind: ScanKind }>>`
    select path, kind from public.media_scans
    where status in ('pending', 'error') and attempts < ${MAX_ATTEMPTS} and created_at < now() - interval '20 seconds'
    order by created_at limit ${limit}`;
  for (const row of rows) await scanOne(row.path, row.kind);
  return { checked: rows.length, configured: true };
}

export type TextTarget = 'post' | 'room_post' | 'listing';

/**
 * After publishing, check the words too. Best effort and flag-only: if the check fails or is rate limited the
 * content simply stays unchecked, and reports still work.
 */
export function scheduleTextScan(kind: TextTarget, id: string, text: string): void {
  const trimmed = text.trim();
  if (trimmed.length < 12 || !isGeminiConfigured()) return;
  after(async () => {
    try {
      const { reason, detail } = await scanTextWithGemini(trimmed);
      if (!reason) return;
      const detailJson = JSON.stringify(detail);
      await prisma.$queryRaw`select public.flag_content(${kind}, ${id}::uuid, 'text', ${reason}, ${detailJson}::jsonb)`;
    } catch (error) {
      console.error('Text check failed.', error instanceof Error ? error.message : 'unknown');
    }
  });
}
