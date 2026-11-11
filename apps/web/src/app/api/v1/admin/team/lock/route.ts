import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v1/admin/team/lock { confirm: "LOCK" }: owner only. After this no staff account can ever be created or promoted
 * from the dashboard again. There is deliberately no unlock: only a direct database change can undo it.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'team');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || body.confirm !== 'LOCK') return apiError('confirm_required', 'Type LOCK to confirm. This cannot be undone.', 422);
  await prisma.$executeRaw`
    insert into public.admin_settings (key, value) values ('admin_creation_locked', 'true')
    on conflict (key) do update set value = 'true', updated_at = now()`;
  return apiSuccess({ locked: true });
}
