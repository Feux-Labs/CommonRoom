import { apiError, apiSuccess, authenticateRequest, createPublicSupabase, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = request.headers.has('authorization') ? await authenticateRequest(request) : null;
  if (auth && !isAuthenticatedRequest(auth)) return auth;
  if (!auth || auth.user.is_anonymous) {
    const { data, error } = await createPublicSupabase().rpc('get_public_meet_profiles');
    if (error) return apiError('dating_unavailable', 'Connect profiles could not be loaded.', 500);
    return apiSuccess({
      me: {
        profile: { displayName: '', school: null, course: '', year: '', avatarUrl: null },
        meet: null,
      },
      profiles: data ?? [],
      people: [],
    });
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('age_eligibility_confirmed, display_name, school, course, year, avatar_url')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return apiError('dating_unavailable', 'Connect profiles could not be loaded.', 500);
  if (!profile?.age_eligibility_confirmed) {
    return apiError('age_eligibility_required', 'Complete age eligibility confirmation before using Connect.', 403);
  }

  const { data: ownProfile, error: ownProfileError } = await auth.supabase
    .from('dating_profiles')
    .select('user_id, display_name, school, bio, interests, photo_urls, discoverable')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (ownProfileError) return apiError('dating_unavailable', 'Your Connect profile could not be loaded.', 500);

  const { data, error } = await auth.supabase
    .from('dating_profiles')
    .select('user_id, display_name, school, bio, interests, photo_urls')
    .eq('discoverable', true)
    .neq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(40);
  if (error) return apiError('dating_unavailable', 'Connect profiles could not be loaded.', 500);

  const candidates = data ?? [];
  const candidateIds = candidates.map((candidate) => candidate.user_id);
  const { data: candidateProfiles, error: candidateProfilesError } = candidateIds.length
    ? await auth.supabase.from('profiles')
      .select('id, username, course, year, avatar_url')
      .in('id', candidateIds)
    : { data: [], error: null };
  if (candidateProfilesError) return apiError('dating_unavailable', 'Student details could not be loaded.', 500);
  const profileById = new Map((candidateProfiles ?? []).map((item) => [item.id, item]));

  const [outgoingResult, incomingResult] = await Promise.all([
    auth.supabase.from('dating_likes').select('to_user_id').eq('from_user_id', auth.user.id),
    auth.supabase.from('dating_likes').select('from_user_id').eq('to_user_id', auth.user.id),
  ]);
  if (outgoingResult.error || incomingResult.error) {
    return apiError('dating_unavailable', 'Your people could not be loaded.', 500);
  }
  const outgoingIds = new Set((outgoingResult.data ?? []).map((like) => like.to_user_id));
  const incomingIds = new Set((incomingResult.data ?? []).map((like) => like.from_user_id));
  const { data: passedRows, error: passesError } = await auth.supabase
    .from('dating_passes')
    .select('to_user_id')
    .eq('from_user_id', auth.user.id);
  if (passesError) return apiError('dating_unavailable', 'Your discovery history could not be loaded.', 500);
  const passedIds = new Set((passedRows ?? []).map((pass) => pass.to_user_id));
  const mutualIds = [...outgoingIds].filter((id) => incomingIds.has(id));
  const mutualProfileResult = mutualIds.length
    ? await auth.supabase.from('dating_profiles')
      .select('user_id, display_name, school, bio, interests, photo_urls')
      .in('user_id', mutualIds)
    : { data: [], error: null };
  if (mutualProfileResult.error) return apiError('dating_unavailable', 'Your people could not be loaded.', 500);

  const mutualProfiles = mutualProfileResult.data ?? [];
  const connectionProfilesResult = mutualIds.length
    ? await auth.supabase.from('profiles').select('id, username, course, year, avatar_url').in('id', mutualIds)
    : { data: [], error: null };
  if (connectionProfilesResult.error) return apiError('dating_unavailable', 'Your people could not be loaded.', 500);
  const connectionDetails = new Map((connectionProfilesResult.data ?? []).map((item) => [item.id, item]));

  return apiSuccess({
    me: {
      profile: {
        displayName: profile.display_name,
        school: profile.school,
        course: profile.course,
        year: profile.year,
        avatarUrl: profile.avatar_url,
      },
      meet: ownProfile,
    },
    profiles: candidates.filter((candidate) => !outgoingIds.has(candidate.user_id) && !passedIds.has(candidate.user_id)).map((candidate) => ({
      ...candidate,
      ...(profileById.get(candidate.user_id) ?? {}),
    })),
    people: mutualProfiles.map((candidate) => ({
      ...candidate,
      ...(connectionDetails.get(candidate.user_id) ?? {}),
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send a valid Connect profile.', 400);

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('age_eligibility_confirmed, school')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return apiError('dating_profile_save_failed', 'Your Connect profile could not be saved.', 500);
  if (!profile?.age_eligibility_confirmed) {
    return apiError('age_eligibility_required', 'Complete age eligibility confirmation before using Connect.', 403);
  }

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : [];
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : [];
  if (!displayName || displayName.length > 80 || bio.length > 500 || interests.length > 20
    || photoUrls.length > 6 || photoUrls.some((value) => {
      try {
        return new URL(value).protocol !== 'https:';
      } catch {
        return true;
      }
    })) {
    return apiError('invalid_dating_profile', 'Add a display name, a short bio, up to 20 interests, and up to 6 secure photo URLs.', 422);
  }

  const { data, error } = await auth.supabase
    .from('dating_profiles')
    .upsert({
      user_id: auth.user.id,
      display_name: displayName,
      school: profile.school,
      bio,
      interests: [...new Set(interests)],
      photo_urls: [...new Set(photoUrls)],
      discoverable: body.discoverable === true,
    }, { onConflict: 'user_id' })
    .select('user_id, display_name, school, bio, interests, photo_urls, discoverable')
    .single();
  if (error) return apiError('dating_profile_save_failed', 'Your Connect profile could not be saved.', 500);
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || body.userId === auth.user.id) {
    return apiError('invalid_user', 'Choose a different profile.', 422);
  }
  const action = body.action === 'pass' ? 'pass' : 'like';
  const { data: target, error: targetError } = await auth.supabase
    .from('dating_profiles')
    .select('user_id')
    .eq('user_id', body.userId)
    .eq('discoverable', true)
    .maybeSingle();
  if (targetError || !target) return apiError('profile_unavailable', 'This Connect profile is no longer available.', 404);

  if (action === 'pass') {
    const { error: passError } = await auth.supabase.from('dating_passes').upsert({
      from_user_id: auth.user.id,
      to_user_id: body.userId,
    }, { onConflict: 'from_user_id,to_user_id', ignoreDuplicates: true });
    if (passError) return apiError('dating_pass_failed', 'This profile could not be skipped.', 500);
    return apiSuccess({ passed: true });
  }

  const { error } = await auth.supabase.from('dating_likes').upsert({
    from_user_id: auth.user.id,
    to_user_id: body.userId,
    is_super_like: body.superLike === true,
  }, { onConflict: 'from_user_id,to_user_id', ignoreDuplicates: true });
  if (error) return apiError('dating_like_failed', 'Your interest could not be sent.', 500);

  const { data: match, error: matchError } = await auth.supabase
    .from('dating_likes')
    .select('from_user_id')
    .eq('from_user_id', body.userId)
    .eq('to_user_id', auth.user.id)
    .maybeSingle();
  if (matchError) return apiError('dating_match_check_failed', 'Your interest was saved, but the response could not be checked.', 500);
  return apiSuccess({ liked: true, matched: Boolean(match), superLike: body.superLike === true }, 201);
}
