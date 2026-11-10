import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { isMailerConfigured, sendEmail } from '@/lib/mailer';
import { restrictionEndedEmail } from '@/lib/emails/restriction-ended';

const MAX_ATTEMPTS = 5;
const BATCH = 50;

type Due = { id: string; user_id: string; email: string | null; display_name: string | null };

/**
 * Emails people whose pause or ban has ended ("Your account is open again"), once each. Run it on a schedule.
 * Protected by CRON_SECRET (the scheduler sends `Authorization: Bearer <CRON_SECRET>`); without the secret it refuses.
 * Safe to run any number of times: a restriction is marked only after its email was accepted, and someone who is
 * under a NEWER restriction is not told they are back.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isMailerConfigured()) return NextResponse.json({ ok: true, configured: false, sent: 0 });

  const due = await prisma.$queryRaw<Due[]>`
    select r.id, r.user_id, u.email, p.display_name
    from public.user_restrictions r
    join auth.users u on u.id = r.user_id
    left join public.profiles p on p.id = r.user_id
    where r.ends_at <= now() and r.ended_notified_at is null and r.notify_attempts < ${MAX_ATTEMPTS}
      and not exists (select 1 from public.user_restrictions n where n.user_id = r.user_id and n.ends_at > now())
    order by r.ends_at limit ${BATCH}`;

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    // Guest sessions have no email: there is nobody to write to, so close it out.
    if (!row.email) {
      await prisma.$executeRaw`update public.user_restrictions set ended_notified_at = now() where id = ${row.id}::uuid`;
      continue;
    }
    try {
      const result = await sendEmail(restrictionEndedEmail(row.email, row.display_name));
      if (result === 'sent') {
        await prisma.$executeRaw`update public.user_restrictions set ended_notified_at = now() where id = ${row.id}::uuid`;
        sent += 1;
      }
    } catch (error) {
      failed += 1;
      console.error('Restriction-ended email failed.', error instanceof Error ? error.message : 'unknown');
      await prisma.$executeRaw`update public.user_restrictions set notify_attempts = notify_attempts + 1 where id = ${row.id}::uuid`;
    }
  }
  return NextResponse.json({ ok: true, configured: true, due: due.length, sent, failed });
}
