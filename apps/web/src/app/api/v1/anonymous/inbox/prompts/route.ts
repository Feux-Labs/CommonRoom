import { apiError, apiSuccess } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';
import { rejectUnsafeAnonymousText } from '@/lib/text-filter';
import { generatePromptIdeas, isPromptGenerationConfigured } from '@/lib/prompt-ideas';

/**
 * POST /api/v1/anonymous/inbox/prompts { hint? }: five AI-written prompt ideas. Optional: the app always has its own
 * starter list, so when this is unavailable the person simply keeps using that.
 */
export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || (body.hint !== undefined && typeof body.hint !== 'string')) return anonymousInvalidBody('Send a short topic hint, or nothing.');
  const hint = (typeof body.hint === 'string' ? body.hint : '').replace(/\s+/g, ' ').trim();
  if (hint.length > 40) return anonymousInvalidBody('Keep the hint to a few words.');
  const unsafe = rejectUnsafeAnonymousText(hint);
  if (unsafe) return unsafe;
  const auth = await authenticateAnonymousRequest(request);
  if ('response' in auth) return auth.response;
  if (!isPromptGenerationConfigured()) return apiError('ai_unavailable', 'AI ideas aren’t available right now. Use the starter prompts.', 503);

  const { error: limitError } = await auth.supabase.rpc('consume_prompt_generation');
  if (limitError) return anonymousRpcError(limitError, 'Try again in a bit.');
  try {
    return apiSuccess({ ideas: await generatePromptIdeas(hint) });
  } catch {
    return apiError('ai_unavailable', 'AI ideas aren’t available right now. Use the starter prompts.', 503);
  }
}
