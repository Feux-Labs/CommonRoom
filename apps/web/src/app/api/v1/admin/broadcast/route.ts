import { NextResponse } from 'next/server';
import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError } from '@/lib/supabase-server';

// In-memory broadcast store (persists per server instance).
// In production this would use Redis or the DB.
let activeBroadcast: { message: string; createdAt: string } | null = {
  message: 'Reminder: Final semester exam timetable is out on the portal. Study hard!',
  createdAt: new Date().toISOString(),
};

/** GET /api/v1/admin/broadcast — anyone can read the current broadcast */
export async function GET() {
  return apiSuccess({ broadcast: activeBroadcast });
}

/** POST /api/v1/admin/broadcast — admin only: set broadcast */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return apiError('invalid_input', 'Broadcast message cannot be empty.', 400);
    }
    if (message.length > 500) {
      return apiError('invalid_input', 'Broadcast message must be 500 characters or less.', 400);
    }
    activeBroadcast = { message, createdAt: new Date().toISOString() };
    return apiSuccess({ broadcast: activeBroadcast });
  } catch {
    return apiError('invalid_json', 'Invalid request body.', 400);
  }
}

/** DELETE /api/v1/admin/broadcast — admin only: clear broadcast */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  activeBroadcast = null;
  return apiSuccess({ broadcast: null });
}
