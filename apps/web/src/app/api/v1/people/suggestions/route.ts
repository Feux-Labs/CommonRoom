import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

type Row = { id: string; display_name: string; username: string; avatar_url: string | null; school: string | null; mutual_count: number; same_school: boolean };

/** GET /api/v1/people/suggestions: People You May Know for the signed-in member. Guests get an empty list. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  if (auth.user.is_anonymous) return apiSuccess([]);
  const { data, error } = await auth.supabase.rpc('suggest_people', { p_limit: 12 });
  if (error) return apiError('suggestions_failed', 'Suggestions could not be loaded.', 500);
  return apiSuccess(((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    avatar_url: row.avatar_url,
    school: row.school,
    reason: row.mutual_count > 0
      ? `${row.mutual_count} mutual ${row.mutual_count === 1 ? 'follow' : 'follows'}`
      : row.same_school ? 'Same school' : 'New on Common Room',
  })));
}
