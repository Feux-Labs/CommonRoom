import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const safeQuery = query.replace(/[%_,()]/g, ' ').slice(0, 40).trim();
  const limit = 24;
  let builder = auth.supabase
    .from('profiles')
    .select('id, display_name, username, school, bio, avatar_url, show_school_on_profile')
    .neq('id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (safeQuery) {
    builder = builder.or(`display_name.ilike.%${safeQuery}%,username.ilike.%${safeQuery}%`);
  }

  const { data, error } = await builder;
  if (error) return apiError('people_failed', 'People could not be loaded.', 500);

  const ids = (data ?? []).map((row) => row.id);
  const { data: follows } = ids.length
    ? await auth.supabase.from('follows').select('following_id').eq('follower_id', auth.user.id).in('following_id', ids)
    : { data: [] as { following_id: string }[] };
  const following = new Set((follows ?? []).map((row) => row.following_id));

  const { data: followerRows } = ids.length
    ? await auth.supabase.from('follows').select('following_id').in('following_id', ids)
    : { data: [] as { following_id: string }[] };
  const counts = new Map<string, number>();
  for (const row of followerRows ?? []) {
    counts.set(row.following_id, (counts.get(row.following_id) ?? 0) + 1);
  }

  return apiSuccess((data ?? []).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    school: row.show_school_on_profile ? row.school : null,
    bio: row.bio ?? '',
    avatar_url: row.avatar_url,
    following: following.has(row.id),
    follower_count: counts.get(row.id) ?? 0,
  })));
}
