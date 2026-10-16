import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson, requireRegisteredUser } from '@/lib/supabase-server';
import {
  createDailyPuzzle,
  type PuzzleDifficulty,
  type WordPath,
  utcDateKey,
  validateWordPaths,
} from '@/lib/daily-puzzle';

const difficulties: PuzzleDifficulty[] = ['easy', 'medium', 'hard'];
const periods = ['daily', 'weekly'] as const;
const scopes = ['friends', 'school'] as const;
const visibilities = ['private', 'friends', 'school'] as const;

function missingPuzzleSchema(error: { code?: string; message?: string }) {
  const schemaMissing = error.code === 'PGRST202'
    || error.code === 'PGRST205'
    || error.message?.includes('Could not find the function')
    || error.message?.includes('does not exist');
  if (!schemaMissing) return null;
  return apiError(
    'puzzle_storage_unavailable',
    'Puzzle sync and leaderboards are not set up on the server yet. Your browser will keep a local copy of your progress.',
    503,
  );
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;

  const query = new URL(request.url).searchParams;
  const period = query.get('period') ?? 'daily';
  const scope = query.get('scope') ?? 'friends';
  if (!periods.includes(period as typeof periods[number]) || !scopes.includes(scope as typeof scopes[number])) {
    return apiError('invalid_leaderboard_filter', 'Choose a valid leaderboard period and audience.', 422);
  }

  const [{ data: leaderboard, error: leaderboardError }, { data: attempts, error: attemptsError }, { data: preference, error: preferenceError }] = await Promise.all([
    auth.supabase.rpc('get_daily_puzzle_leaderboard', { p_period: period, p_scope: scope }),
    auth.supabase
      .from('daily_puzzle_attempts')
      .select('puzzle_date, difficulty, score, elapsed_seconds, hints_used, completed_at')
      .eq('user_id', auth.user.id)
      .not('completed_at', 'is', null)
      .order('puzzle_date', { ascending: false })
      .limit(90),
    auth.supabase
      .from('daily_puzzle_preferences')
      .select('leaderboard_visibility')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ]);

  const databaseError = leaderboardError ?? attemptsError ?? preferenceError;
  if (databaseError) {
    console.error('[puzzle] Could not load saved progress:', {
      code: databaseError.code,
      message: databaseError.message,
    });
    return missingPuzzleSchema(databaseError)
      ?? apiError('puzzle_progress_load_failed', 'Your puzzle progress could not be loaded.', 500);
  }

  return apiSuccess({
    leaderboard: leaderboard ?? [],
    attempts: attempts ?? [],
    visibility: preference?.leaderboard_visibility ?? 'private',
  });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;
  const accountError = requireRegisteredUser(auth);
  if (accountError) return accountError;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.action !== 'string') {
    return apiError('invalid_body', 'Send a valid puzzle action.', 400);
  }

  if (body.action === 'start') {
    const difficulty = body.difficulty;
    const date = body.date;
    if (
      !difficulties.includes(difficulty as PuzzleDifficulty)
      || date !== utcDateKey()
    ) {
      return apiError('invalid_puzzle', 'Choose today’s puzzle and a valid difficulty.', 422);
    }
    const puzzle = createDailyPuzzle(date, difficulty as PuzzleDifficulty);
    if (
      JSON.stringify(body.grid) !== JSON.stringify(puzzle.grid)
      || JSON.stringify(body.words) !== JSON.stringify(puzzle.words)
    ) {
      return apiError('invalid_puzzle', 'This puzzle does not match today’s official board.', 422);
    }
    const { data, error } = await auth.supabase.rpc('start_daily_puzzle_attempt', {
      p_puzzle_date: date,
      p_difficulty: difficulty,
      p_grid: puzzle.grid,
      p_words: puzzle.words,
    });
    if (error) {
      console.error('[puzzle] Could not start attempt:', { code: error.code, message: error.message });
      return missingPuzzleSchema(error)
        ?? apiError('puzzle_attempt_start_failed', 'Your puzzle attempt could not be synced.', 500);
    }
    const attempt = Array.isArray(data) ? data[0] : data;
    return apiSuccess(attempt);
  }

  if (body.action === 'hint') {
    if (typeof body.attemptId !== 'string') {
      return apiError('invalid_attempt', 'A valid puzzle attempt is required to use a hint.', 422);
    }
    const { data, error } = await auth.supabase.rpc('use_daily_puzzle_hint', {
      p_attempt_id: body.attemptId,
    });
    if (error) {
      console.error('[puzzle] Could not use hint:', { code: error.code, message: error.message });
      return apiError('puzzle_hint_failed', error.message || 'A hint could not be used.', 422);
    }
    return apiSuccess({ hintsUsed: data });
  }

  if (body.action === 'finish') {
    if (typeof body.attemptId !== 'string' || !Array.isArray(body.paths)) {
      return apiError('invalid_attempt', 'Send your completed word paths for this attempt.', 422);
    }
    const paths: WordPath[] = [];
    for (const value of body.paths) {
      if (!isRecord(value) || typeof value.word !== 'string' || !Array.isArray(value.cells)) {
        return apiError('invalid_word_paths', 'One or more selected word paths are invalid.', 422);
      }
      const cells: WordPath['cells'] = [];
      for (const cell of value.cells) {
        if (
          !isRecord(cell)
          || typeof cell.row !== 'number'
          || typeof cell.column !== 'number'
        ) return apiError('invalid_word_paths', 'One or more selected word paths are invalid.', 422);
        cells.push({ row: cell.row, column: cell.column });
      }
      paths.push({ word: value.word, cells });
    }

    const { data: attempt, error: attemptError } = await auth.supabase
      .from('daily_puzzle_attempts')
      .select('puzzle_date, difficulty, grid, words')
      .eq('id', body.attemptId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (attemptError) {
      console.error('[puzzle] Could not verify attempt:', { code: attemptError.code, message: attemptError.message });
      return missingPuzzleSchema(attemptError)
        ?? apiError('puzzle_attempt_load_failed', 'Your puzzle attempt could not be verified.', 500);
    }
    if (!attempt) return apiError('puzzle_attempt_not_found', 'This puzzle attempt could not be found.', 404);

    const puzzle = createDailyPuzzle(attempt.puzzle_date, attempt.difficulty as PuzzleDifficulty);
    if (
      JSON.stringify(attempt.grid) !== JSON.stringify(puzzle.grid)
      || JSON.stringify(attempt.words) !== JSON.stringify(puzzle.words)
      || !validateWordPaths(puzzle, paths)
    ) {
      return apiError('invalid_word_paths', 'Find every word on today’s board before submitting.', 422);
    }
    const { data, error } = await auth.supabase.rpc('finish_daily_puzzle_attempt', {
      p_attempt_id: body.attemptId,
      p_word_paths: paths,
    });
    if (error) {
      console.error('[puzzle] Could not finish attempt:', { code: error.code, message: error.message });
      return missingPuzzleSchema(error)
        ?? apiError('puzzle_attempt_finish_failed', error.message || 'Your puzzle result could not be saved.', 500);
    }
    const result = Array.isArray(data) ? data[0] : data;
    return apiSuccess(result);
  }

  if (body.action === 'privacy') {
    if (!visibilities.includes(body.visibility as typeof visibilities[number])) {
      return apiError('invalid_leaderboard_visibility', 'Choose private, friends, or school visibility.', 422);
    }
    const { data, error } = await auth.supabase.rpc('set_daily_puzzle_leaderboard_visibility', {
      p_visibility: body.visibility,
    });
    if (error) {
      console.error('[puzzle] Could not save leaderboard privacy:', { code: error.code, message: error.message });
      return missingPuzzleSchema(error)
        ?? apiError('puzzle_privacy_save_failed', 'Your leaderboard privacy setting could not be saved.', 500);
    }
    return apiSuccess({ visibility: data });
  }

  return apiError('unknown_puzzle_action', 'Choose a supported puzzle action.', 422);
}
