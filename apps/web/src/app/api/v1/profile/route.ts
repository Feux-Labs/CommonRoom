import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import type { EducationStatus } from '@/lib/contracts';
import { readProfileCache, writeProfileCache, type CachedProfile } from '@/lib/profile-cache';
import { isOwnStorageUrl } from '@/lib/media-url';
import { normaliseUsername, usernameError, usernameFromName, withSuffix } from '@/lib/username';

const profileFields = 'id, display_name, username, avatar_url, education_status, school, show_school_on_profile, course, year, age_eligibility_confirmed, interests';
const educationStatuses: EducationStatus[] = [
  'currently_in_school',
  'not_in_school_yet',
  'prefer_not_to_say',
];

function profileQueryError(error: { code?: string; message: string }, operation: 'read' | 'save') {
  console.error(`[profile] ${operation} failed:`, { code: error.code, message: error.message });
  return apiError(
    operation === 'read' ? 'profile_read_failed' : 'profile_save_failed',
    error.message || (operation === 'read' ? 'Your profile could not be loaded.' : 'Your profile could not be saved.'),
    500,
  );
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  const cached = await readProfileCache(auth.user.id);
  if (cached.value) return apiSuccess(cached.value, 200, { 'x-cache-status': 'hit' });

  try {
    const { data, error } = await auth.supabase
      .from('profiles')
      .select(profileFields)
      .eq('id', auth.user.id)
      .maybeSingle();

    if (!error && data) {
      const cacheStatus = await writeProfileCache(data as CachedProfile);
      return apiSuccess(data, 200, { 'x-cache-status': cacheStatus });
    }
  } catch (err) {
    console.warn('[profile] database read skipped; checking auth metadata fallback.', err);
  }

  return apiSuccess(null);
}

export async function PUT(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;

  const body = await parseJson(request);
  if (!isRecord(body)) return apiError('invalid_body', 'Send a valid profile object.', 400);

  const educationStatus = body.educationStatus;
  const school = typeof body.school === 'string' && body.school.trim() ? body.school.trim() : null;
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const course = typeof body.course === 'string' ? body.course.trim() : '';
  const year = typeof body.year === 'string' ? body.year.trim() : '';
  const ageConfirmed = body.ageEligibilityConfirmed === true;
  const showSchool = body.showSchoolOnProfile === true;
  const avatarUrl = body.avatarUrl;
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : [];

  if (!educationStatuses.includes(educationStatus as EducationStatus)) {
    return apiError('invalid_education_status', 'Choose a valid education status.', 422);
  }
  if (!displayName || displayName.length > 80) {
    return apiError('invalid_display_name', 'Display name must contain 1 to 80 characters.', 422);
  }
  if (!ageConfirmed) {
    return apiError('age_eligibility_required', 'Confirm that you meet the app’s age eligibility requirement.', 422);
  }
  if (educationStatus === 'currently_in_school' && !school) {
    return apiError('school_required', 'Choose your school or change your education status.', 422);
  }
  if (interests.length > 20 || interests.some((interest) => interest.length > 50)) {
    return apiError('invalid_interests', 'Choose up to 20 interests, each no longer than 50 characters.', 422);
  }
  if (avatarUrl !== undefined && avatarUrl !== null && (typeof avatarUrl !== 'string' || avatarUrl.length > 2048)) {
    return apiError('invalid_avatar', 'Choose a valid profile photo.', 422);
  }
  if (typeof avatarUrl === 'string' && !isOwnStorageUrl(avatarUrl)) {
    return apiError('invalid_avatar', 'Upload your profile photo through the app.', 422);
  }

  const requested = normaliseUsername(auth.user.user_metadata?.username);
  const preferred = requested && !usernameError(requested) ? requested : usernameFromName(displayName);

  const basePayload = {
    id: auth.user.id,
    display_name: displayName,
    education_status: educationStatus,
    school,
    show_school_on_profile: showSchool,
    course: course.slice(0, 80),
    year: year.slice(0, 40),
    age_eligibility_confirmed: ageConfirmed,
    interests: [...new Set(interests)],
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
  };

  // A username can be taken between the sign-up check and now; retry with a numeric suffix
  // instead of failing the whole sign-up.
  let username = preferred;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await auth.supabase
      .from('profiles')
      .upsert({ ...basePayload, username }, { onConflict: 'id' })
      .select(profileFields)
      .single();

    if (!error && data) {
      const cacheStatus = await writeProfileCache(data as CachedProfile);
      return apiSuccess(data, 200, { 'x-cache-status': cacheStatus });
    }
    const taken = error?.code === '23505' && /username/i.test(`${error.message} ${error.details ?? ''}`);
    if (!taken) return profileQueryError(error ?? { message: 'Profile save returned no data.' }, 'save');
    username = withSuffix(preferred);
  }
  return apiError('username_taken', 'We could not find a free username. Try again.', 409);
}
