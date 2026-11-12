import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sendStreakRemindersWithin } from '@/lib/streak-reminders';

export const maxDuration = 60;

/**
 * Daily nudges for people whose streak is slipping: the evening after a missed day, after 3 days and after 7 days (once each).
 * A notification in the app plus a push alert when they turned alerts on. Protected by CRON_SECRET like the other scheduled jobs.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Any scheduler can call this as often as it likes (every 15 minutes is fine): it only sends between 17:00 and 20:59 in Nigeria, and each person at most once per gap.
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', hour12: false }));
  if (hour < 17 || hour > 20) return NextResponse.json({ ok: true, reminded: 0, waiting: 'outside the evening window' });
  try {
    return NextResponse.json({ ok: true, reminded: await sendStreakRemindersWithin(45_000) });
  } catch {
    return NextResponse.json({ error: 'reminders_failed' }, { status: 500 });
  }
}
