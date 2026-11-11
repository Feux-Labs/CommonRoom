import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { communityError, communityTextProblem, mapCommunity, type CommunityRow } from '@/lib/communities';

/** GET /api/v1/communities?q=: the most popular communities, or the ones matching a search. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 40);
  const { data, error } = await auth.supabase.rpc('list_communities', { p_query: q || null, p_limit: 30 });
  if (error) return communityError(error, 'Communities could not be loaded.');
  return apiSuccess(((data ?? []) as CommunityRow[]).map(mapCommunity));
}

/** POST /api/v1/communities { name, description?, school? }: start a community. You become its owner and first member. */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  if (auth.user.is_anonymous) return apiError('account_required', 'Create an account to start a community.', 403);
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.name !== 'string' || (body.description !== undefined && typeof body.description !== 'string')
    || (body.school !== undefined && body.school !== null && typeof body.school !== 'string')) {
    return apiError('invalid_community', 'Give your community a name and an optional description.', 422);
  }
  const description = typeof body.description === 'string' ? body.description : '';
  const school = typeof body.school === 'string' ? body.school.slice(0, 120) : null;
  const problem = communityTextProblem(body.name, description);
  if (problem) return apiError('text_not_allowed', 'Community names and descriptions can’t include phone numbers, email addresses or links.', 422);
  const { data, error } = await auth.supabase.rpc('create_community', { p_name: body.name, p_description: description, p_school: school });
  if (error) return communityError(error, 'Your community could not be created.');
  const created = (Array.isArray(data) ? data[0] : data) as { id: string; slug: string } | undefined;
  return apiSuccess({ id: created?.id, slug: created?.slug }, 201);
}
