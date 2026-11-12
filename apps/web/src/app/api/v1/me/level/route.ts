import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest } from '@/lib/supabase-server';

type Row = {
  points: number | string; level: number; level_name: string; phase: string; step: number; floor_points: number; next_at: number | null;
  pro: boolean; pro_until: string | null; ultimate_pass: boolean; ladder: Array<{ name: string; phase: string; start: number }>;
  earned_points: number | string; boost_price_kobo: number | null; boost_available_at: string | null;
};

/** GET /api/v1/me/level: your rank (phase, rank, step), points toward the next step, the full ladder, and Pro. Private to you. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  if (auth.user.is_anonymous) return apiError('account_required', 'Create an account to earn levels.', 403);
  const { data, error } = await auth.supabase.rpc('my_level');
  if (error) {
    if (error.message.includes('account_required')) return apiError('account_required', 'Finish your profile to earn levels.', 403);
    return apiError('level_failed', 'Your level could not be loaded.', 500);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row) return apiError('level_failed', 'Your level could not be loaded.', 500);
  return apiSuccess({
    points: Number(row.points), rankNumber: row.level, rank: row.level_name, phase: row.phase, step: row.step,
    stepFloor: row.floor_points, nextStepAt: row.next_at, ladder: row.ladder,
    pro: row.pro, proUntil: row.pro_until, ultimatePass: row.ultimate_pass,
    earnedPoints: Number(row.earned_points), boostPriceNaira: row.boost_price_kobo ? row.boost_price_kobo / 100 : null, boostAvailableAt: row.boost_available_at,
  });
}
