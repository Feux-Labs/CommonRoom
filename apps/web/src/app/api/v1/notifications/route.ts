import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

type Row = {
  id: string;
  kind: string;
  actor_id: string | null;
  actor_name: string | null;
  post_id: string | null;
  anon_post_id: string | null;
  thread_id: string | null;
  preview: string | null;
  title: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** GET /api/v1/notifications?limit=30: your newest notifications and how many are unread. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const requested = Number(new URL(request.url).searchParams.get('limit') ?? 30);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 100) : 30;

  const [list, unread] = await Promise.all([
    auth.supabase
      .from('notifications')
      .select('id, kind, actor_id, actor_name, post_id, anon_post_id, thread_id, preview, title, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    auth.supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);
  if (list.error || unread.error) return apiError('notifications_failed', 'Notifications could not be loaded.', 500);

  return apiSuccess({
    unread: unread.count ?? 0,
    items: (list.data as Row[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      actorId: row.actor_id,
      actorName: row.actor_name,
      postId: row.post_id,
      anonPostId: row.anon_post_id,
      threadId: row.thread_id,
      preview: row.preview,
      title: row.title,
      link: row.link,
      read: row.read_at !== null,
      createdAt: row.created_at,
    })),
  });
}

/** POST /api/v1/notifications { action: "read_all" }: marks everything as read. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || body.action !== 'read_all') return apiError('invalid_body', 'Unknown action.', 400);

  const { error } = await auth.supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) return apiError('notifications_failed', 'Notifications could not be updated.', 500);
  return apiSuccess({ ok: true });
}
