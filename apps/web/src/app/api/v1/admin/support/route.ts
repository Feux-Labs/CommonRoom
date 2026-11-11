import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

type Row = {
  id: string; kind: string; subject: string; status: string; created_at: Date; updated_at: Date; user_id: string | null; is_guest: boolean | null;
  email: string | null; display_name: string | null; handle: string | null; messages: bigint; last_author: string | null; preview: string | null;
};

/** GET /api/v1/admin/support?status=open|resolved|all: everyone's issues, including guests and Anonymous users. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'support');
  if (!isAdminAuthenticated(auth)) return auth;
  const status = new URL(request.url).searchParams.get('status') ?? 'open';
  const filter = status === 'all' ? null : status === 'resolved' ? 'resolved' : 'open';
  const rows = await prisma.$queryRaw<Row[]>`
    select t.id::text as id, t.kind, t.subject, t.status, t.created_at, t.updated_at, t.user_id::text as user_id,
      u.is_anonymous as is_guest, u.email, p.display_name, i.handle,
      (select count(*) from public.support_messages m where m.ticket_id = t.id) as messages,
      (select m.author from public.support_messages m where m.ticket_id = t.id order by m.created_at desc limit 1) as last_author,
      (select left(m.body, 160) from public.support_messages m where m.ticket_id = t.id order by m.created_at desc limit 1) as preview
    from public.support_tickets t
    left join auth.users u on u.id = t.user_id
    left join public.profiles p on p.id = t.user_id
    left join public.anonymous_identities i on i.user_id = t.user_id
    where (${filter}::text is null or t.status = ${filter})
    order by (t.status = 'open') desc, t.updated_at desc limit 100`;
  const open = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.support_tickets where status = 'open'`;
  return apiSuccess({
    openCount: Number(open[0]?.n ?? 0),
    tickets: rows.map((row) => ({
      id: row.id, kind: row.kind, subject: row.subject, status: row.status, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
      who: { userId: row.user_id, guest: row.is_guest === true, email: row.email, name: row.display_name, anonymousId: row.handle },
      messages: Number(row.messages), lastAuthor: row.last_author, preview: row.preview,
    })),
  });
}
