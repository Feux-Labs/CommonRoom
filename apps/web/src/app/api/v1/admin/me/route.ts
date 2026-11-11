import { authenticateAdmin, isAdminAuthenticated, ROLE_PERMISSIONS } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/** GET /api/v1/admin/me: who you are in the dashboard, what you may do, and whether new staff accounts are locked. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;
  const locked = await prisma.$queryRaw<Array<{ value: string }>>`select value from public.admin_settings where key = 'admin_creation_locked'`;
  return apiSuccess({ role: auth.role, email: auth.user.email ?? '', permissions: ROLE_PERMISSIONS[auth.role], creationLocked: locked[0]?.value === 'true' });
}
