import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCES = ['anonymous', 'room', 'marketplace', 'auto'];
const ACTIONS = ['dismiss', 'remove', 'remove_strike'];

type QueueRow = {
  report_id: string;
  source: string;
  target_kind: string;
  target_id: string;
  reason: string;
  reported_at: Date;
  preview: string | null;
  author_id: string | null;
  report_count: bigint;
  author_strikes: bigint;
};

/** GET /api/v1/admin/moderation: open reports from Anonymous, Room and Marketplace, most-reported first. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;
  try {
    const rows = await prisma.$queryRaw<QueueRow[]>`select * from public.moderation_queue(100)`;
    return apiSuccess(rows.map((row) => ({
      reportId: row.report_id,
      source: row.source,
      targetKind: row.target_kind,
      targetId: row.target_id,
      reason: row.reason,
      reportedAt: row.reported_at,
      preview: row.preview,
      authorId: row.author_id,
      reportCount: Number(row.report_count),
      authorStrikes: Number(row.author_strikes),
    })));
  } catch (error) {
    console.error('Moderation queue failed.', error instanceof Error ? error.message.split('\n')[0] : 'unknown');
    return apiError('queue_failed', 'The report queue could not be loaded.', 500);
  }
}

/** POST /api/v1/admin/moderation { source, reportId, action }: dismiss, remove, or remove and give a strike. */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.source !== 'string' || !SOURCES.includes(body.source)
    || typeof body.reportId !== 'string' || !UUID.test(body.reportId)
    || typeof body.action !== 'string' || !ACTIONS.includes(body.action)) {
    return apiError('invalid_body', 'Send a report source, id and action.', 400);
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ r: unknown }>>`
      select public.resolve_report(${body.source}, ${body.reportId}::uuid, ${body.action}, ${`admin:${auth.user.id}`}) as r`;
    return apiSuccess(rows[0]?.r ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('report_not_found')) return apiError('report_not_found', 'That report was already handled.', 404);
    console.error('Report could not be resolved.', message.split('\n')[0]);
    return apiError('resolve_failed', 'The report could not be resolved.', 500);
  }
}
