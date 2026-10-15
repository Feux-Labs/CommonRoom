import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('age_eligibility_confirmed')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return apiError('dating_unavailable', 'Dating profiles could not be loaded.', 500);
  if (!profile?.age_eligibility_confirmed) {
    return apiError('age_eligibility_required', 'Complete age eligibility confirmation before using dating.', 403);
  }

  const { data, error } = await auth.supabase
    .from('dating_profiles')
    .select('user_id, display_name, school, bio, interests')
    .eq('discoverable', true)
    .neq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(40);
  if (error) return apiError('dating_unavailable', 'Dating profiles could not be loaded.', 500);
  return apiSuccess(data ?? []);
}

export async function PUT(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send a valid dating profile.', 400);

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('age_eligibility_confirmed, school')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return apiError('dating_profile_save_failed', 'Your dating profile could not be saved.', 500);
  if (!profile?.age_eligibility_confirmed) {
    return apiError('age_eligibility_required', 'Complete age eligibility confirmation before using dating.', 403);
  }

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : [];
  if (!displayName || displayName.length > 80 || bio.length > 500 || interests.length > 20) {
    return apiError('invalid_dating_profile', 'Add a display name, a short bio, and up to 20 interests.', 422);
  }

  const { data, error } = await auth.supabase
    .from('dating_profiles')
    .upsert({
      user_id: auth.user.id,
      display_name: displayName,
      school: profile.school,
      bio,
      interests: [...new Set(interests)],
      discoverable: body.discoverable === true,
    }, { onConflict: 'user_id' })
    .select('user_id, display_name, school, bio, interests, discoverable')
    .single();
  if (error) return apiError('dating_profile_save_failed', 'Your dating profile could not be saved.', 500);
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || body.userId === auth.user.id) {
    return apiError('invalid_user', 'Choose a different profile.', 422);
  }

  const { error } = await auth.supabase.from('dating_likes').upsert({
    from_user_id: auth.user.id,
    to_user_id: body.userId,
  }, { onConflict: 'from_user_id,to_user_id', ignoreDuplicates: true });
  if (error) return apiError('dating_like_failed', 'Your like could not be sent.', 500);

  const { data: match, error: matchError } = await auth.supabase
    .from('dating_likes')
    .select('from_user_id')
    .eq('from_user_id', body.userId)
    .eq('to_user_id', auth.user.id)
    .maybeSingle();
  if (matchError) return apiError('dating_match_check_failed', 'Your like was saved, but the match status could not be checked.', 500);
  return apiSuccess({ liked: true, matched: Boolean(match) }, 201);
}
