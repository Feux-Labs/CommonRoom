import { apiError, apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';
import { rejectUnsafeAnonymousText } from '@/lib/text-filter';
import { isFlagEnabled } from '@/lib/flags';
import { prisma } from '@/lib/prisma';

const HINT_KEYS = ['school', 'year', 'course'] as const;

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!(await isFlagEnabled('anonymous_inbox'))) return apiError('feature_disabled', 'Inbox messages are paused for a moment. Please try again later.', 503);
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.body !== 'string') return anonymousInvalidBody('Write a message to send anonymously.');
  const unsafe = rejectUnsafeAnonymousText(body.body);
  if (unsafe) return unsafe;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.supabase.rpc('send_anonymous_inbox_message', {
    p_token: token,
    p_body: body.body,
  });
  if (error) return anonymousRpcError(error, 'Your anonymous message could not be sent.');
  const sent = (Array.isArray(data) ? data[0] ?? null : null) as { thread_id?: string } | null;

  // Hints: only the facts the sender ticked, read from their own profile (so they are true), and only for signed-up members.
  const chosen = Array.isArray(body.hints) ? body.hints.filter((item): item is (typeof HINT_KEYS)[number] => typeof item === 'string' && (HINT_KEYS as readonly string[]).includes(item)) : [];
  if (sent?.thread_id && chosen.length > 0) {
    try {
      const rows = await prisma.$queryRaw<Array<{ school: string | null; year: string | null; course: string | null }>>`select school, year, course from public.profiles where id = ${auth.userId}::uuid`;
      const profile = rows[0];
      const hints: Record<string, string> = {};
      for (const key of chosen) {
        const value = profile?.[key]?.trim();
        if (value) hints[key] = value.slice(0, 120);
      }
      if (profile && Object.keys(hints).length > 0) {
        await prisma.$executeRaw`update public.anonymous_inbox_threads set sender_hints = sender_hints || ${JSON.stringify(hints)}::jsonb where id = ${sent.thread_id}::uuid and sender_id = ${auth.userId}::uuid`;
      }
    } catch (hintError) {
      // The message is already sent; hints are a bonus.
      console.error('Hints could not be saved.', hintError instanceof Error ? hintError.message : 'unknown');
    }
  }
  return apiSuccess(sent, 201);
}
