import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/** POST /api/v1/support/[id] { body }: add to your own issue. A resolved issue reopens. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isRecord(body) || typeof body.body !== 'string' || body.body.trim().length < 1) return apiError('invalid_body', 'Write your message.', 422);
  const owns = await prisma.$queryRaw<Array<{ ok: boolean }>>`select true as ok from public.support_tickets where id = ${id}::uuid and user_id = ${auth.user.id}::uuid`;
  if (!owns[0]) return apiError('not_found', 'That issue could not be found.', 404);
  await prisma.$executeRaw`insert into public.support_messages (ticket_id, author, body) values (${id}::uuid, 'user', ${body.body.trim().slice(0, 3000)})`;
  await prisma.$executeRaw`update public.support_tickets set status = 'open', updated_at = now(), resolved_at = null where id = ${id}::uuid`;
  return apiSuccess({ ok: true }, 201);
}
