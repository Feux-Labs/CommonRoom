import { apiError, apiSuccess } from '@/lib/supabase-server';
import { authenticateAnonymousRequest } from '@/lib/anonymous-api';
import { prisma } from '@/lib/prisma';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/anonymous/inbox/threads/[id]/hints: the hints the sender chose to share (their school, year or course).
 * Only the person whose link it is can ask, and only Pro members get the details; everyone else just learns that hints exist.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return apiError('invalid_input', 'That conversation could not be found.', 400);
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const rows = await prisma.$queryRaw<Array<{ sender_hints: Record<string, string>; pro: boolean }>>`
    select t.sender_hints, public.is_pro(${auth.userId}::uuid) as pro
    from public.anonymous_inbox_threads t join public.anonymous_inbox_links l on l.id = t.link_id
    where t.id = ${id}::uuid and l.owner_id = ${auth.userId}::uuid`;
  const row = rows[0];
  if (!row) return apiError('not_found', 'That conversation could not be found.', 404);
  const count = Object.keys(row.sender_hints ?? {}).length;
  return apiSuccess(row.pro ? { locked: false, count, hints: row.sender_hints ?? {} } : { locked: true, count, hints: {} });
}
