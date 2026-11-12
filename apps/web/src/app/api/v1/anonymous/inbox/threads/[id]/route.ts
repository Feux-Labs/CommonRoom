import { apiSuccess } from '@/lib/supabase-server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('get_anonymous_inbox_messages', { p_thread_id: id });
  if (error) return anonymousRpcError(error, 'This private conversation could not be loaded.');
  return apiSuccess(data ?? []);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string') return anonymousInvalidBody('Write a reply.');
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('reply_anonymous_inbox_thread', {
    p_thread_id: id,
    p_body: body.body,
  });
  if (error) return anonymousRpcError(error, 'Your private reply could not be sent.');
  after(async () => {
    const other = await prisma.$queryRaw<Array<{ other_id: string; is_owner: boolean }>>`
      select case when l.owner_id = ${auth.userId}::uuid then t.sender_id else l.owner_id end::text as other_id, (l.owner_id = ${auth.userId}::uuid) as is_owner
      from public.anonymous_inbox_threads t join public.anonymous_inbox_links l on l.id = t.link_id where t.id = ${id}::uuid`.catch(() => []);
    if (other[0]) {
      await sendPushToUsers([other[0].other_id], other[0].is_owner
        ? { title: 'You got a reply', body: 'Someone replied to your anonymous message.', url: `/anonymous/inbox/thread/${id}?from=sent` }
        : { title: 'New reply in your inbox', body: 'They wrote back. Tap to read it.', url: `/anonymous/inbox/thread/${id}` });
    }
  });
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
