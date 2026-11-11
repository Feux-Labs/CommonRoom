import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

type FlagRow = { path: string; owner_id: string | null; kind: string; level: string; action_taken: string | null; detail: unknown; scanned_at: Date };

/** GET /api/v1/admin/media-flags: photos and videos the scanner flagged, newest first, so a person can review them. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'moderation');
  if (!isAdminAuthenticated(auth)) return auth;
  try {
    const rows = await prisma.$queryRaw<FlagRow[]>`
      select path, owner_id, kind, level, action_taken, detail, scanned_at
      from public.media_scans where status = 'flagged' order by scanned_at desc limit 100`;
    return apiSuccess(rows.map((row) => ({
      path: row.path,
      ownerId: row.owner_id,
      kind: row.kind,
      level: row.level,
      actionTaken: row.action_taken,
      detail: row.detail,
      scannedAt: row.scanned_at,
    })));
  } catch (error) {
    console.error('Media flags could not be loaded.', error instanceof Error ? error.message.split('\n')[0] : 'unknown');
    return apiError('flags_failed', 'The flagged media could not be loaded.', 500);
  }
}
