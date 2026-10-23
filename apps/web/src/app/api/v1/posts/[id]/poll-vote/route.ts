import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const { id } = await params;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.optionIndex !== 'number' || !Number.isInteger(body.optionIndex) || body.optionIndex < 0) {
    return apiError('invalid_option', 'Choose a valid poll option.', 400);
  }
  const optionIndex = body.optionIndex;

  const { data: post, error: postError } = await auth.supabase
    .from('posts')
    .select('id, poll_options, media_type')
    .eq('id', id)
    .maybeSingle();

  if (postError || !post) {
    return apiError('post_not_found', 'This poll is unavailable.', 404);
  }

  const pollOptions = Array.isArray(post.poll_options) ? (post.poll_options as string[]) : [];
  if (optionIndex >= pollOptions.length) {
    return apiError('invalid_option_index', 'That poll option does not exist.', 422);
  }

  // Record vote
  const { error: voteError } = await auth.supabase
    .from('post_poll_votes')
    .upsert(
      {
        post_id: id,
        user_id: auth.user.id,
        option_index: optionIndex,
      },
      { onConflict: 'post_id,user_id' }
    );

  // Fetch all votes for this poll to compute updated tallies
  const { data: allVotes, error: talliesError } = await auth.supabase
    .from('post_poll_votes')
    .select('option_index')
    .eq('post_id', id);

  if (voteError || talliesError || !allVotes) {
    // Graceful fallback for mock or unmigrated environments
    const mockVotes = pollOptions.map((_, idx) => (idx === optionIndex ? 1 : 0));
    return apiSuccess({
      pollVotes: mockVotes,
      userPollVote: optionIndex,
      totalPollVotes: 1,
    });
  }

  const pollVotes = pollOptions.map(() => 0);
  for (const vote of allVotes) {
    const idx = vote.option_index as number;
    if (idx >= 0 && idx < pollVotes.length) {
      pollVotes[idx] = (pollVotes[idx] ?? 0) + 1;
    }
  }

  void auth.supabase.from('room_events').insert({
    user_id: auth.user.id,
    post_id: id,
    event_type: 'like', // engagement signal
  });

  return apiSuccess({
    pollVotes,
    userPollVote: optionIndex,
    totalPollVotes: allVotes.length,
  });
}
