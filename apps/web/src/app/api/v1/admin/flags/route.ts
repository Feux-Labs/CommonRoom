import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { FLAG_KEYS } from '@/lib/flags';

type FlagRow = { key: string; enabled: boolean; description: string; updated_at: Date };

/** GET /api/v1/admin/flags: every flag with its description. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'flags');
  if (!isAdminAuthenticated(auth)) return auth;
  const rows = await prisma.$queryRaw<FlagRow[]>`select key, enabled, description, updated_at from public.feature_flags order by key`;
  return apiSuccess({ flags: rows.map((row) => ({ key: row.key, enabled: row.enabled, description: row.description, updatedAt: row.updated_at.toISOString() })) });
}

/** PUT /api/v1/admin/flags: { key, enabled } flips one switch. */
export async function PUT(request: Request) {
  const auth = await authenticateAdmin(request, 'flags');
  if (!isAdminAuthenticated(auth)) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('invalid_json', 'Invalid request body.', 400); }
  const { key, enabled } = (body ?? {}) as { key?: unknown; enabled?: unknown };
  if (typeof key !== 'string' || !(FLAG_KEYS as readonly string[]).includes(key) || typeof enabled !== 'boolean') {
    return apiError('invalid_input', 'Send a known flag key and enabled true or false.', 400);
  }
  const updated = await prisma.$executeRaw`update public.feature_flags set enabled = ${enabled}, updated_at = now(), updated_by = ${auth.user.id}::uuid where key = ${key}`;
  if (updated === 0) return apiError('not_found', 'That flag does not exist.', 404);
  return apiSuccess({ key, enabled });
}
