import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const KINDS = ['bug', 'account', 'abuse', 'payment', 'other'];

type TicketRow = { id: string; kind: string; subject: string; status: string; created_at: Date; updated_at: Date };
type MessageRow = { ticket_id: string; author: string; body: string; created_at: Date };

/** GET /api/v1/support: your own issues and the replies. Guests can have them too. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const tickets = await prisma.$queryRaw<TicketRow[]>`
    select id::text as id, kind, subject, status, created_at, updated_at from public.support_tickets where user_id = ${auth.user.id}::uuid order by updated_at desc limit 20`;
  const ids = tickets.map((ticket) => ticket.id);
  const messages = ids.length
    ? await prisma.$queryRaw<MessageRow[]>`select ticket_id::text as ticket_id, author, body, created_at from public.support_messages where ticket_id = any(${ids}::uuid[]) order by created_at`
    : [];
  return apiSuccess(tickets.map((ticket) => ({
    id: ticket.id, kind: ticket.kind, subject: ticket.subject, status: ticket.status, createdAt: ticket.created_at.toISOString(), updatedAt: ticket.updated_at.toISOString(),
    messages: messages.filter((message) => message.ticket_id === ticket.id).map((message) => ({ author: message.author, body: message.body, createdAt: message.created_at.toISOString() })),
  })));
}

/**
 * POST /api/v1/support { kind, subject, message, page? }: tell us about a problem. Works for guests and Anonymous users too,
 * so the team can help people who have no account.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.subject !== 'string' || typeof body.message !== 'string') return apiError('invalid_body', 'Add a short title and describe the problem.', 422);
  const kind = typeof body.kind === 'string' && KINDS.includes(body.kind) ? body.kind : 'other';
  const subject = body.subject.replace(/\s+/g, ' ').trim().slice(0, 120);
  const message = body.message.trim().slice(0, 3000);
  if (!subject || message.length < 5) return apiError('invalid_body', 'Add a short title and describe the problem.', 422);

  const recent = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.support_tickets where user_id = ${auth.user.id}::uuid and created_at > now() - interval '1 hour'`;
  if (Number(recent[0]?.n ?? 0) >= 5) return apiError('rate_limited', 'You’ve sent a few already. We’ll get back to you soon.', 429);

  const context = {
    page: typeof body.page === 'string' ? body.page.slice(0, 200) : null,
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 200),
    guest: auth.user.is_anonymous === true,
  };
  const created = await prisma.$queryRaw<Array<{ id: string }>>`
    insert into public.support_tickets (user_id, kind, subject, context) values (${auth.user.id}::uuid, ${kind}, ${subject}, ${JSON.stringify(context)}::jsonb) returning id::text as id`;
  await prisma.$executeRaw`insert into public.support_messages (ticket_id, author, body) values (${created[0].id}::uuid, 'user', ${message})`;
  return apiSuccess({ id: created[0].id }, 201);
}
