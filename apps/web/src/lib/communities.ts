import { apiError } from './supabase-server';
import { anonymousTextProblem } from './text-filter';

export type CommunityRow = {
  id: string; slug: string; name: string; description: string; school: string | null;
  member_count: number; joined: boolean; role: string | null;
};

export function mapCommunity(row: CommunityRow) {
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description, school: row.school,
    memberCount: row.member_count, joined: row.joined, isOwner: row.role === 'owner',
  };
}

/** Group names and descriptions are public, so they cannot carry phone numbers, emails or links. */
export function communityTextProblem(...texts: string[]): string | null {
  return anonymousTextProblem(...texts);
}

export function communityError(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? '';
  const known: Array<[string, string, number, string]> = [
    ['account_required', 'account_required', 403, 'Create an account to use Communities.'],
    ['invalid_community', 'invalid_community', 422, 'Give your community a name of 3 to 40 characters and a description up to 200.'],
    ['community_limit', 'community_limit', 409, 'You can own up to 5 communities.'],
    ['community_not_found', 'community_not_found', 404, 'That community could not be found.'],
    ['owner_cannot_leave', 'owner_cannot_leave', 409, 'You started this community. Delete it instead of leaving.'],
    ['invalid_reason', 'invalid_reason', 422, 'Add a short reason (3 to 500 characters).'],
    ['own_community', 'own_community', 422, 'You can’t report your own community.'],
    ['anonymous_rate_limit_exceeded', 'rate_limited', 429, 'You’re doing that too often. Please try again later.'],
  ];
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return apiError(match[1], match[3], match[2]);
  console.error('Community request failed.', { code: error.code ?? 'unknown' });
  return apiError('community_failed', fallback, 500);
}
