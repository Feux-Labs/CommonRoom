import { prisma } from '@/lib/prisma';
import { isMailerConfigured, sendEmail } from '@/lib/mailer';
import { sendPushToUsers } from '@/lib/push';

/**
 * Tells the owner and admins that something needs a look: an in-app notification, a push alert to any device they have enabled,
 * and an email as well when email is set up. At most one alert with the same title an hour, so an attack cannot flood anyone.
 */
export async function alertStaff(title: string, body: string, link: string): Promise<void> {
  try {
    const staff = await prisma.$queryRaw<Array<{ id: string; email: string | null }>>`
      select r.user_id::text as id, u.email from public.admin_roles r join auth.users u on u.id = r.user_id where r.role in ('owner', 'admin')`;
    if (staff.length === 0) return;
    const recent = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.notifications where kind = 'system' and title = ${title} and created_at > now() - interval '1 hour'`;
    if (Number(recent[0]?.n ?? 0) > 0) return;
    for (const person of staff) {
      await prisma.$executeRaw`insert into public.notifications (user_id, kind, title, link, preview) values (${person.id}::uuid, 'system', ${title}, ${link}, ${body.slice(0, 200)})`.catch(() => undefined);
    }
    await sendPushToUsers(staff.map((person) => person.id), { title, body, url: link });
    if (isMailerConfigured()) {
      for (const person of staff) {
        if (person.email) await sendEmail({ to: person.email, subject: title, text: body, html: `<p>${body}</p>` }).catch(() => undefined);
      }
    }
  } catch {
    // Alerts are best effort.
  }
}
