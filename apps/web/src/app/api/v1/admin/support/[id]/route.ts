import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

type TicketRow = {
  id: string; kind: string; subject: string; status: string; context: Record<string, unknown>; created_at: Date; user_id: string | null;
  is_guest: boolean | null; email: string | null; user_created: Date | null; display_name: string | null; username: string | null; school: string | null; handle: string | null;
  strikes: bigint | null; anon_posts: bigint | null; room_posts: bigint | null; listings: bigint | null; last_seen: Date | null; country: string | null; device: string | null; browser: string | null;
};

const uuid = /^[0-9a-f-]{36}$/i;

/** GET /api/v1/admin/support/[id]: one issue, its thread, and what we know about the person so you can help them. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateAdmin(request, 'support');
  if (!isAdminAuthenticated(auth)) return auth;
  if (!uuid.test(id)) return apiError('invalid_input', 'That issue could not be found.', 400);
  const rows = await prisma.$queryRaw<TicketRow[]>`
    select t.id::text as id, t.kind, t.subject, t.status, t.context, t.created_at, t.user_id::text as user_id,
      u.is_anonymous as is_guest, u.email, u.created_at as user_created, p.display_name, p.username, p.school, i.handle,
      (select count(*) from public.user_restrictions r where r.user_id = t.user_id) as strikes,
      (select count(*) from public.anonymous_posts a where a.author_id = t.user_id) as anon_posts,
      (select count(*) from public.posts x where x.author_id = t.user_id) as room_posts,
      (select count(*) from public.marketplace_listings l where l.seller_id = t.user_id) as listings,
      v.last_seen, v.country, v.device, v.browser
    from public.support_tickets t
    left join auth.users u on u.id = t.user_id
    left join public.profiles p on p.id = t.user_id
    left join public.anonymous_identities i on i.user_id = t.user_id
    left join public.visitor_profiles v on v.user_id = t.user_id
    where t.id = ${id}::uuid`;
  const t = rows[0];
  if (!t) return apiError('not_found', 'That issue could not be found.', 404);
  const messages = await prisma.$queryRaw<Array<{ author: string; body: string; created_at: Date }>>`select author, body, created_at from public.support_messages where ticket_id = ${id}::uuid order by created_at`;
  return apiSuccess({
    id: t.id, kind: t.kind, subject: t.subject, status: t.status, createdAt: t.created_at.toISOString(), context: t.context,
    person: {
      userId: t.user_id, guest: t.is_guest === true, email: t.email, name: t.display_name, username: t.username, school: t.school, anonymousId: t.handle,
      joined: t.user_created ? t.user_created.toISOString() : null, strikes: Number(t.strikes ?? 0), anonymousPosts: Number(t.anon_posts ?? 0), roomPosts: Number(t.room_posts ?? 0),
      listings: Number(t.listings ?? 0), lastSeen: t.last_seen ? t.last_seen.toISOString() : null, country: t.country, device: t.device, browser: t.browser,
    },
    messages: messages.map((message) => ({ author: message.author, body: message.body, createdAt: message.created_at.toISOString() })),
  });
}

/** POST /api/v1/admin/support/[id] { body?, status? }: reply, and/or mark it resolved or open. The person is notified. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateAdmin(request, 'support');
  if (!isAdminAuthenticated(auth)) return auth;
  const input = await parseJson(request);
  if (!uuid.test(id) || !isRecord(input)) return apiError('invalid_input', 'Send a reply or a status.', 400);
  const reply = typeof input.body === 'string' ? input.body.trim().slice(0, 3000) : '';
  const status = input.status === 'resolved' || input.status === 'open' ? input.status : null;
  if (!reply && !status) return apiError('invalid_input', 'Send a reply or a status.', 400);
  const found = await prisma.$queryRaw<Array<{ user_id: string | null }>>`select user_id::text as user_id from public.support_tickets where id = ${id}::uuid`;
  if (!found[0]) return apiError('not_found', 'That issue could not be found.', 404);

  if (reply) {
    await prisma.$executeRaw`insert into public.support_messages (ticket_id, author, staff_id, body) values (${id}::uuid, 'staff', ${auth.user.id}::uuid, ${reply})`;
    if (found[0].user_id) {
      await prisma.$executeRaw`insert into public.notifications (user_id, kind, title, link) values (${found[0].user_id}::uuid, 'system', 'Common Room support replied to your issue', '/help')`.catch(() => undefined);
    }
  }
  if (status === 'resolved') {
    await prisma.$executeRaw`update public.support_tickets set status = 'resolved', updated_at = now(), resolved_at = now(), resolved_by = ${auth.user.id}::uuid where id = ${id}::uuid`;
  } else if (status === 'open') {
    await prisma.$executeRaw`update public.support_tickets set status = 'open', updated_at = now(), resolved_at = null where id = ${id}::uuid`;
  } else {
    await prisma.$executeRaw`update public.support_tickets set updated_at = now() where id = ${id}::uuid`;
  }
  return apiSuccess({ ok: true });
}
