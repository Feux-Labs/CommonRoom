'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculatePuzzleScore,
  createDailyPuzzle,
  puzzleDifficulties,
  type PuzzleCell,
  type PuzzleDifficulty,
  type WordPath,
  utcDateKey,
} from '@/lib/daily-puzzle';

type Visibility = 'private' | 'friends' | 'school';
type Period = 'daily' | 'weekly';
type Scope = 'friends' | 'school';
type PuzzleRecord = {
  date: string;
  difficulty: PuzzleDifficulty;
  score: number;
  elapsedSeconds: number;
  hintsUsed: number;
};
type SavedProgress = {
  startedAt: number;
  hintsUsed: number;
  foundPaths: WordPath[];
  attemptId?: string;
};
type SavedPuzzleData = {
  records: PuzzleRecord[];
  progress: Record<string, SavedProgress>;
  visibility: Visibility;
};
type LeaderboardEntry = {
  rank: number;
  display_name?: string;
  score: number;
  completed_days?: number;
  displayName?: string;
  completedDays?: number;
};
type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };

const emptyData: SavedPuzzleData = { records: [], progress: {}, visibility: 'private' };
const storageVersion = 'schoomate.daily-puzzle.v2';
const sampleLeaderboard: LeaderboardEntry[] = [
  { rank: 1, displayName: 'Ada C.', score: 850, completedDays: 4 },
  { rank: 2, displayName: 'Tomi O.', score: 790, completedDays: 4 },
  { rank: 3, displayName: 'Zainab M.', score: 725, completedDays: 3 },
  { rank: 4, displayName: 'Chidi N.', score: 680, completedDays: 3 },
  { rank: 5, displayName: 'You', score: 620, completedDays: 2 },
];

function readSavedData(key: string): SavedPuzzleData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as Partial<SavedPuzzleData>;
    if (!Array.isArray(parsed.records) || typeof parsed.progress !== 'object' || !parsed.progress) {
      return emptyData;
    }
    return {
      records: parsed.records.filter((record): record is PuzzleRecord => (
        Boolean(record)
        && typeof record.date === 'string'
        && ['easy', 'medium', 'hard'].includes(record.difficulty)
        && Number.isFinite(record.score)
        && Number.isFinite(record.elapsedSeconds)
        && Number.isFinite(record.hintsUsed)
      )).slice(-365),
      progress: parsed.progress,
      visibility: ['private', 'friends', 'school'].includes(parsed.visibility ?? '')
        ? parsed.visibility as Visibility
        : 'private',
    };
  } catch {
    return emptyData;
  }
}

async function requestPuzzle<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok) {
    throw new Error((result as ApiFailure | null)?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  if (!result || !('data' in result)) throw new Error('The puzzle service returned an invalid response.');
  return result.data;
}

function getStreak(records: PuzzleRecord[], today: string) {
  const dates = [...new Set(records.map((record) => record.date))].sort().reverse();
  if (dates.length === 0) return 0;
  const daysSinceLastPlay = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86400000,
  );
  if (daysSinceLastPlay > 2) return 0;
  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const gap = Math.round((Date.parse(`${dates[index - 1]}T00:00:00Z`) - Date.parse(`${dates[index]}T00:00:00Z`)) / 86400000);
    if (gap > 2) break;
    streak += 1;
  }
  return streak;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function puzzleProgressKey(date: string, difficulty: PuzzleDifficulty) {
  return `${date}:${difficulty}`;
}

export function PuzzleRetentionExperience({
  accessToken,
  playerId,
  playerName,
  preview = false,
  launchRequest = 0,
}: {
  accessToken?: string;
  playerId?: string;
  playerName?: string;
  preview?: boolean;
  launchRequest?: number;
}) {
  const [data, setData] = useState<SavedPuzzleData>(emptyData);
  const [hydrated, setHydrated] = useState(false);
  const [period, setPeriod] = useState<Period>('daily');
  const [scope, setScope] = useState<Scope>('friends');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [syncMessage, setSyncMessage] = useState('');
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>('medium');
  const [currentDate, setCurrentDate] = useState('');
  const [foundPaths, setFoundPaths] = useState<WordPath[]>([]);
  const [selectedCells, setSelectedCells] = useState<PuzzleCell[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintText, setHintText] = useState('');
  const [result, setResult] = useState<PuzzleRecord | null>(null);
  const finishing = useRef(false);
  const handledLaunch = useRef(0);
  const dataRef = useRef(data);
  const storageKey = `${storageVersion}.${playerId ?? 'guest'}`;
  const puzzle = useMemo(() => createDailyPuzzle(currentDate, difficulty), [currentDate, difficulty]);
  const complete = foundPaths.length === puzzle.words.length;
  const foundWords = new Set(foundPaths.map((path) => path.word));
  const foundCells = new Set(foundPaths.flatMap((path) => path.cells.map((cell) => `${cell.row}:${cell.column}`)));
  const bestScores = useMemo(() => ({
    easy: Math.max(0, ...data.records.filter((record) => record.difficulty === 'easy').map((record) => record.score)),
    medium: Math.max(0, ...data.records.filter((record) => record.difficulty === 'medium').map((record) => record.score)),
    hard: Math.max(0, ...data.records.filter((record) => record.difficulty === 'hard').map((record) => record.score)),
  }), [data.records]);
  const streak = useMemo(() => getStreak(data.records, currentDate), [currentDate, data.records]);
  const todayBest = Math.max(0, ...data.records.filter((record) => record.date === currentDate).map((record) => record.score));

  useEffect(() => {
    let active = true;
    window.setTimeout(() => {
      if (!active) return;
      const saved = readSavedData(storageKey);
      setCurrentDate(utcDateKey());
      dataRef.current = saved;
      setData(saved);
      setHydrated(true);
    }, 0);
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    dataRef.current = data;
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      window.setTimeout(() => {
        setSyncMessage('This browser could not save puzzle progress. Keep this tab open until you finish.');
      }, 0);
    }
  }, [data, hydrated, storageKey]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void requestPuzzle<{
      leaderboard: LeaderboardEntry[];
      attempts: Array<{
        puzzle_date: string;
        difficulty: PuzzleDifficulty;
        score: number;
        elapsed_seconds: number;
        hints_used: number;
      }>;
      visibility: Visibility;
    }>(`/api/v1/games/puzzles?period=${period}&scope=${scope}`, accessToken).then((saved) => {
      if (!active) return;
      setLeaderboard(saved.leaderboard);
      setData((current) => ({
        ...current,
        records: saved.attempts.map((attempt) => ({
          date: attempt.puzzle_date,
          difficulty: attempt.difficulty,
          score: attempt.score,
          elapsedSeconds: attempt.elapsed_seconds,
          hintsUsed: attempt.hints_used,
        })),
        visibility: saved.visibility,
      }));
      setSyncMessage('');
    }).catch((error: unknown) => {
      if (!active) return;
      setSyncMessage(error instanceof Error ? error.message : 'Online puzzle progress could not be loaded; this device copy is still available.');
    });
    return () => {
      active = false;
    };
  }, [accessToken, period, scope]);

  useEffect(() => {
    if (!showPuzzle || startedAt === null || complete) return;
    const updateTime = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, [complete, showPuzzle, startedAt]);

  useEffect(() => {
    if (!showPuzzle) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPuzzle(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [result, showPuzzle]);

  const updateProgress = useCallback((next: SavedProgress | null, date: string, level: PuzzleDifficulty) => {
    const key = puzzleProgressKey(date, level);
    setData((current) => {
      const progress = { ...current.progress };
      if (next) progress[key] = next;
      else delete progress[key];
      return { ...current, progress };
    });
  }, []);

  const startPuzzle = useCallback(async (level: PuzzleDifficulty, restart = false) => {
    const date = utcDateKey();
    const selectedPuzzle = createDailyPuzzle(date, level);
    const key = puzzleProgressKey(date, level);
    const savedProgress = restart ? undefined : dataRef.current.progress[key];
    const continuing = Boolean(savedProgress && !dataRef.current.records.some(
      (record) => record.date === date && record.difficulty === level && savedProgress.foundPaths.length >= selectedPuzzle.words.length,
    ));
    const nextProgress: SavedProgress = continuing && savedProgress
      ? savedProgress
      : { startedAt: Date.now(), hintsUsed: 0, foundPaths: [] };
    setCurrentDate(date);
    setDifficulty(level);
    setFoundPaths(nextProgress.foundPaths);
    setSelectedCells([]);
    setHintsUsed(nextProgress.hintsUsed);
    setStartedAt(nextProgress.startedAt);
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - nextProgress.startedAt) / 1000)));
    setHintText('');
    setResult(null);
    setAttemptId(nextProgress.attemptId ?? null);
    finishing.current = false;
    setShowPuzzle(true);
    updateProgress(nextProgress, date, level);

    if (accessToken && !nextProgress.attemptId) {
      try {
        const started = await requestPuzzle<{ attempt_id: string; started_at: string }>(
          '/api/v1/games/puzzles',
          accessToken,
          'POST',
          { action: 'start', date, difficulty: level, grid: selectedPuzzle.grid, words: selectedPuzzle.words },
        );
        const startedProgress = { ...nextProgress, startedAt: Date.parse(started.started_at), attemptId: started.attempt_id };
        setAttemptId(started.attempt_id);
        setStartedAt(startedProgress.startedAt);
        updateProgress(startedProgress, date, level);
        setSyncMessage('');
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : 'Online sync is unavailable; progress is saved on this device.');
      }
    }
  }, [accessToken, updateProgress]);

  useEffect(() => {
    if (!hydrated || launchRequest <= handledLaunch.current) return;
    handledLaunch.current = launchRequest;
    void startPuzzle('medium');
  }, [hydrated, launchRequest, startPuzzle]);

  const finishPuzzle = async (paths: WordPath[]) => {
    if (finishing.current) return;
    finishing.current = true;
    const elapsed = Math.max(0, Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000));
    let score = calculatePuzzleScore(difficulty, elapsed, hintsUsed);
    let savedElapsed = elapsed;
    if (accessToken && attemptId) {
      try {
        const saved = await requestPuzzle<{
          score: number;
          elapsed_seconds: number;
          hints_used: number;
        }>('/api/v1/games/puzzles', accessToken, 'POST', {
          action: 'finish',
          attemptId,
          paths,
        });
        score = saved.score;
        savedElapsed = saved.elapsed_seconds;
        setSyncMessage('');
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : 'Result could not sync; the score is saved on this device.');
      }
    }

    const record: PuzzleRecord = {
      date: currentDate,
      difficulty,
      score,
      elapsedSeconds: savedElapsed,
      hintsUsed,
    };
    setData((current) => ({ ...current, records: [...current.records, record].slice(-365) }));
    updateProgress(null, currentDate, difficulty);
    setResult(record);
    setFoundPaths(paths);
    setSelectedCells([]);
    setShowPuzzle(true);
    finishing.current = false;
  };

  const selectCell = (cell: PuzzleCell) => {
    if (complete) return;
    const key = `${cell.row}:${cell.column}`;
    if (foundCells.has(key)) return;
    const alreadySelected = selectedCells.some((item) => item.row === cell.row && item.column === cell.column);
    if (alreadySelected || selectedCells.length === 0) {
      setSelectedCells([cell]);
      return;
    }

    const first = selectedCells[0];
    const previous = selectedCells[selectedCells.length - 1];
    const deltaRow = cell.row - previous.row;
    const deltaColumn = cell.column - previous.column;
    const straight = Math.abs(deltaRow) <= 1 && Math.abs(deltaColumn) <= 1 && (deltaRow !== 0 || deltaColumn !== 0);
    const directionAllowed = puzzleDifficulties[difficulty].directions.some(([row, column]) => (
      (deltaRow === row && deltaColumn === column)
      || (deltaRow === -row && deltaColumn === -column)
    ));
    const sameDirection = selectedCells.length < 2 || (
      deltaRow === selectedCells[1].row - first.row
      && deltaColumn === selectedCells[1].column - first.column
    );
    if (!straight || !directionAllowed || !sameDirection) {
      setSelectedCells([cell]);
      return;
    }

    const nextSelection = [...selectedCells, cell];
    const formedWord = nextSelection.map(({ row, column }) => puzzle.grid[row][column]).join('');
    const matchedWord = puzzle.words.find((word) => (
      !foundWords.has(word)
      && (word === formedWord || [...word].reverse().join('') === formedWord)
    ));
    if (matchedWord) {
      const nextPaths = [...foundPaths, { word: matchedWord, cells: nextSelection }];
      setFoundPaths(nextPaths);
      setSelectedCells([]);
      updateProgress({
        startedAt: startedAt ?? Date.now(),
        hintsUsed,
        foundPaths: nextPaths,
        ...(attemptId ? { attemptId } : {}),
      }, currentDate, difficulty);
      setHintText('');
      if (nextPaths.length === puzzle.words.length) void finishPuzzle(nextPaths);
      return;
    }
    setSelectedCells(nextSelection);
  };

  const handleHint = async () => {
    const nextWord = puzzle.words.find((word) => !foundWords.has(word));
    if (!nextWord) return;
    const path = puzzle.placements[nextWord];
    const nextHints = hintsUsed + 1;
    setHintsUsed(nextHints);
    setHintText(`${nextWord} starts at row ${path[0].row + 1}, column ${path[0].column + 1}.`);
    updateProgress({
      startedAt: startedAt ?? Date.now(),
      hintsUsed: nextHints,
      foundPaths,
      ...(attemptId ? { attemptId } : {}),
    }, currentDate, difficulty);

    if (accessToken && attemptId) {
      try {
        await requestPuzzle('/api/v1/games/puzzles', accessToken, 'POST', { action: 'hint', attemptId });
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : 'Hint use could not sync; this device will keep the count.');
      }
    }
  };

  const changeVisibility = async (visibility: Visibility) => {
    setData((current) => ({ ...current, visibility }));
    if (!accessToken) return;
    try {
      await requestPuzzle('/api/v1/games/puzzles', accessToken, 'POST', { action: 'privacy', visibility });
      setSyncMessage('');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Leaderboard privacy could not be updated online.');
    }
  };

  const displayedLeaderboard = accessToken
    ? leaderboard
    : preview ? sampleLeaderboard : [];

  return (
    <>
      <section className="puzzle-retention" aria-label="Daily puzzle progress">
        <div className="games-section-heading puzzle-progress-heading">
          <h2>Daily Word Puzzle</h2>
          <span>{currentDate || 'Daily challenge'}</span>
        </div>
        <div className="puzzle-progress-card">
          <div className="puzzle-progress-copy">
            <strong>Come back for a fresh challenge every day.</strong>
            <p>Choose a difficulty. Your puzzle and unfinished attempt are saved on this device.</p>
          </div>
          <div className="puzzle-stat-strip">
            <div><strong>{streak}</strong><span>day streak</span></div>
            <div><strong>{todayBest || '—'}</strong><span>today’s best</span></div>
            <div><strong>{data.records.length}</strong><span>completed</span></div>
          </div>
          <div className="puzzle-best-row">
            {(['easy', 'medium', 'hard'] as PuzzleDifficulty[]).map((level) => (
              <div key={level}><span>{puzzleDifficulties[level].label} best</span><strong>{bestScores[level] || '—'}</strong></div>
            ))}
          </div>
          <p className="puzzle-streak-note">Streaks allow one missed day before they reset.</p>
          {syncMessage ? <p className="puzzle-sync-message" role="status">{syncMessage}</p> : null}
        </div>

        <div className="puzzle-leaderboard">
          <div className="puzzle-leaderboard-heading">
            <div><span className="games-kicker">DAILY CHALLENGE</span><h3>Leaderboard</h3></div>
            <label className="puzzle-privacy-select">Show me to
              <select aria-label="Leaderboard privacy" onChange={(event) => void changeVisibility(event.target.value as Visibility)} value={data.visibility}>
                <option value="private">Only me</option>
                <option value="friends">Friends</option>
                <option value="school">My school</option>
              </select>
            </label>
          </div>
          <div className="puzzle-leaderboard-controls">
            <div className="puzzle-filter-group" aria-label="Leaderboard period">
              {(['daily', 'weekly'] as Period[]).map((value) => (
                <button aria-pressed={period === value} className={period === value ? 'selected' : ''} key={value} onClick={() => setPeriod(value)} type="button">
                  {value === 'daily' ? 'Today' : 'This week'}
                </button>
              ))}
            </div>
            <div className="puzzle-filter-group" aria-label="Leaderboard audience">
              {(['friends', 'school'] as Scope[]).map((value) => (
                <button aria-pressed={scope === value} className={scope === value ? 'selected' : ''} key={value} onClick={() => setScope(value)} type="button">
                  {value === 'friends' ? 'Friends' : 'My school'}
                </button>
              ))}
            </div>
          </div>
          {displayedLeaderboard.length ? (
            <ol className="puzzle-rank-list">
              {displayedLeaderboard.map((entry) => (
                <li key={`${entry.rank}:${entry.display_name ?? entry.displayName}`}>
                  <span className="puzzle-rank-number">{entry.rank}</span>
                  <strong>{entry.display_name ?? entry.displayName ?? 'Student'}</strong>
                  <span>{entry.score} pts</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="puzzle-leaderboard-empty">
              {accessToken
                ? 'No opted-in scores yet. Finish a puzzle to be the first on this board.'
                : 'Sign in to sync scores and join your friends or school leaderboard.'}
            </p>
          )}
          {preview && !accessToken ? <p className="puzzle-preview-note">Sample leaderboard for screen preview</p> : null}
          <p className="puzzle-privacy-note">Names only—email and private profile details are never shown.</p>
        </div>

        {data.records.length ? (
          <details className="puzzle-history">
            <summary>Recent puzzle results</summary>
            <ul>
              {[...data.records].reverse().slice(0, 5).map((record, index) => (
                <li key={`${record.date}:${record.difficulty}:${index}`}>
                  <span>{record.date} · {puzzleDifficulties[record.difficulty].label}</span>
                  <strong>{record.score} pts · {formatElapsed(record.elapsedSeconds)}</strong>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {showPuzzle ? (
        <PuzzleDialog
          complete={complete}
          date={currentDate}
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          foundCells={foundCells}
          foundPaths={foundPaths}
          foundWords={foundWords}
          grid={puzzle.grid}
          hintText={hintText}
          hintsUsed={hintsUsed}
          onClose={() => setShowPuzzle(false)}
          onDifficultyChange={(level) => void startPuzzle(level)}
          onHint={() => void handleHint()}
          onReset={() => void startPuzzle(difficulty, true)}
          onSelectCell={selectCell}
          result={result}
          playerName={playerName}
          selectedCells={selectedCells}
          words={puzzle.words}
        />
      ) : (
        <div className="puzzle-difficulty-launchers" aria-label="Choose a puzzle difficulty">
          {(['easy', 'medium', 'hard'] as PuzzleDifficulty[]).map((level) => (
            <button className={`puzzle-launch puzzle-launch-${level}`} key={level} onClick={() => void startPuzzle(level)} type="button">
              <span>{puzzleDifficulties[level].label}</span>
              <small>{puzzleDifficulties[level].size}×{puzzleDifficulties[level].size} · {puzzleDifficulties[level].wordCount} words</small>
              <strong>Play today’s puzzle</strong>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PuzzleDialog({
  complete,
  date,
  difficulty,
  elapsedSeconds,
  foundCells,
  foundPaths,
  foundWords,
  grid,
  hintText,
  hintsUsed,
  onClose,
  onDifficultyChange,
  onHint,
  onReset,
  onSelectCell,
  result,
  playerName,
  selectedCells,
  words,
}: {
  complete: boolean;
  date: string;
  difficulty: PuzzleDifficulty;
  elapsedSeconds: number;
  foundCells: Set<string>;
  foundPaths: WordPath[];
  foundWords: Set<string>;
  grid: string[];
  hintText: string;
  hintsUsed: number;
  onClose: () => void;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onHint: () => void;
  onReset: () => void;
  onSelectCell: (cell: PuzzleCell) => void;
  result: PuzzleRecord | null;
  playerName?: string;
  selectedCells: PuzzleCell[];
  words: string[];
}) {
  const selectedKeys = new Set(selectedCells.map((cell) => `${cell.row}:${cell.column}`));
  const scorePreview = calculatePuzzleScore(difficulty, elapsedSeconds, hintsUsed);
  const [shareMessage, setShareMessage] = useState('');

  const shareResult = async () => {
    const shareText = `Daily Word Puzzle · ${puzzleDifficulties[difficulty].label} · ${result?.score ?? scorePreview} points · ${formatElapsed(result?.elapsedSeconds ?? elapsedSeconds)} · ${date}`;
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setShareMessage('Result copied. Share it with your group.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setShareMessage('Could not share this result from your browser.');
      }
    }
  };

  return (
    <div className="games-overlay games-puzzle-overlay" onClick={onClose}>
      <section
        aria-labelledby="daily-puzzle-title"
        aria-modal="true"
        className="games-puzzle"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="games-puzzle-topbar">
          <span className="games-kicker">DAILY CHALLENGE · {date}</span>
          <button className="games-close" onClick={onClose} type="button">Close</button>
        </div>
        <div className="games-puzzle-heading">
          <h2 id="daily-puzzle-title">Daily Word Puzzle</h2>
          <p>Find every word by tracing adjacent letters in a straight line.</p>
          <div className="games-puzzle-art" role="img" aria-label="Daily Word Puzzle artwork" />
        </div>
        <div className="puzzle-difficulty-switch" aria-label="Puzzle difficulty">
          {(['easy', 'medium', 'hard'] as PuzzleDifficulty[]).map((level) => (
            <button aria-pressed={difficulty === level} className={difficulty === level ? 'selected' : ''} key={level} onClick={() => onDifficultyChange(level)} type="button">
              {puzzleDifficulties[level].label}
            </button>
          ))}
        </div>
        {!complete ? (
          <div className="puzzle-live-stats">
            <span>⏱ {formatElapsed(elapsedSeconds)}</span>
            <span>Hints {hintsUsed}/6</span>
            <span>{foundWords.size}/{words.length} found</span>
          </div>
        ) : null}
        <p aria-live="polite" className="games-puzzle-message">
          {complete ? 'Puzzle complete! You found every word.' : 'Tap each word’s letters in order, moving one square at a time.'}
        </p>
        {hintText ? <p className="puzzle-hint-text" role="status">{hintText}</p> : null}
        <div aria-label={`${puzzleDifficulties[difficulty].label} word search grid`} className={`games-puzzle-grid puzzle-grid-${difficulty}`}>
          {grid.map((row, rowIndex) => row.split('').map((letter, columnIndex) => {
            const key = `${rowIndex}:${columnIndex}`;
            const selected = selectedKeys.has(key);
            const found = foundCells.has(key);
            return (
              <button
                aria-label={`${letter}, row ${rowIndex + 1}, column ${columnIndex + 1}`}
                aria-pressed={selected || found}
                className={`games-letter${found ? ' found' : ''}${selected ? ' selected' : ''}`}
                key={key}
                onClick={() => onSelectCell({ row: rowIndex, column: columnIndex })}
                type="button"
              >
                {letter}
              </button>
            );
          }))}
        </div>
        <div aria-label="Words to find" className="games-word-list">
          {words.map((word) => (
            <span className={`games-word-chip${foundWords.has(word) ? ' found' : ''}`} key={word}>
              {word}{foundWords.has(word) ? <small>FOUND</small> : null}
            </span>
          ))}
        </div>
        {complete ? (
          <section aria-label="Puzzle result" className="puzzle-result">
            <span>PUZZLE COMPLETE</span>
            <strong>{result?.score ?? scorePreview} points</strong>
            <p>{playerName ? `${playerName} · ` : ''}{puzzleDifficulties[difficulty].label} · {formatElapsed(result?.elapsedSeconds ?? elapsedSeconds)} · {hintsUsed} hints</p>
            <p>Score = difficulty points + time bonus − 50 points per hint.</p>
            <button className="games-reset" onClick={() => void shareResult()} type="button">Share result</button>
            {shareMessage ? <small role="status">{shareMessage}</small> : null}
          </section>
        ) : (
          <div className="puzzle-action-row">
            <button className="games-reset" disabled={hintsUsed >= 6} onClick={onHint} type="button">Use a hint (−50 pts)</button>
            <button className="games-reset" onClick={onReset} type="button">Start over</button>
          </div>
        )}
        {complete && foundPaths.length ? <span className="visually-hidden">All puzzle paths verified.</span> : null}
      </section>
    </div>
  );
}
