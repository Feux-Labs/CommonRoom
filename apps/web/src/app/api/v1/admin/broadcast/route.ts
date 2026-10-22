import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/** GET /api/v1/admin/broadcast — anyone can read the current broadcast */
export async function GET() {
  const record = await prisma.adminBroadcast.findUnique({ where: { key: 'global' } });
  return apiSuccess({ broadcast: record ? { message: record.message, createdAt: record.createdAt.toISOString() } : null });
}

/** POST /api/v1/admin/broadcast — admin only: set broadcast */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('invalid_json', 'Invalid request body.', 400);
  }
  const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
    ? body.message.trim()
    : '';
  if (!message) return apiError('invalid_input', 'Broadcast message cannot be empty.', 400);
  if (message.length > 500) return apiError('invalid_input', 'Broadcast message must be 500 characters or less.', 400);

  const record = await prisma.adminBroadcast.upsert({
    where: { key: 'global' },
    create: { key: 'global', message },
    update: { message },
  });
  return apiSuccess({ broadcast: { message: record.message, createdAt: record.createdAt.toISOString() } });
}

/** DELETE /api/v1/admin/broadcast — admin only: clear broadcast */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  await prisma.adminBroadcast.deleteMany({ where: { key: 'global' } });
  return apiSuccess({ broadcast: null });
}
