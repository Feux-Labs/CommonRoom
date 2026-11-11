import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/admin/strike { userId, reason }: gives the user their next strike.
 * Strike 1 pauses the account for 3 days, strike 2 for 7 days, strike 3 and later is a ban. Each lifts after 7 days at most.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'moderation');
  if (!isAdminAuthenticated(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || !UUID.test(body.userId)
    || typeof body.reason !== 'string' || body.reason.trim().length < 1 || body.reason.length > 500) {
    return apiError('invalid_body', 'Send a user id and a reason (up to 500 characters).', 400);
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ strike_number: number; kind: string; ends_at: Date }>>`
      select * from public.apply_strike(${body.userId}::uuid, ${body.reason.trim()}, ${`admin:${auth.user.id}`})`;
    const row = rows[0];
    return apiSuccess({ strike: row.strike_number, kind: row.kind, endsAt: row.ends_at }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('user_not_found')) return apiError('user_not_found', 'That user does not exist.', 404);
    console.error('Strike could not be applied.', error instanceof Error ? error.message.split('\n')[0] : 'unknown');
    return apiError('strike_failed', 'The strike could not be applied.', 500);
  }
}
