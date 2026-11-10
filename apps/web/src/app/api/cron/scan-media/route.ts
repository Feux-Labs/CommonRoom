import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { scanPending } from '@/lib/moderation/media-scan';

/**
 * Scheduled retry of photos/videos that are still unscanned (for example if a scan was cut short). Protected by
 * CRON_SECRET: the scheduler sends `Authorization: Bearer <CRON_SECRET>`. With no secret set it refuses to run.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await scanPending(20);
  return NextResponse.json({ ok: true, ...result });
}
