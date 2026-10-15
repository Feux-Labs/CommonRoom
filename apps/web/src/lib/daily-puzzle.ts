export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';
export type PuzzleCell = { row: number; column: number };
export type WordPath = { word: string; cells: PuzzleCell[] };
export type DailyPuzzle = {
  date: string;
  difficulty: PuzzleDifficulty;
  grid: string[];
  words: string[];
  placements: Record<string, PuzzleCell[]>;
};

export const puzzleDifficulties: Record<PuzzleDifficulty, {
  label: string;
  size: number;
  wordCount: number;
  baseScore: number;
  directions: Array<[number, number]>;
}> = {
  easy: {
    label: 'Easy',
    size: 8,
    wordCount: 6,
    baseScore: 100,
    directions: [[0, 1], [1, 0]],
  },
  medium: {
    label: 'Medium',
    size: 10,
    wordCount: 9,
    baseScore: 250,
    directions: [[0, 1], [1, 0], [1, 1], [-1, 1]],
  },
  hard: {
    label: 'Hard',
    size: 12,
    wordCount: 12,
    baseScore: 500,
    directions: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [-1, 1], [1, -1]],
  },
};

const wordBank = [
  'LECTURE', 'CAMPUS', 'HOSTEL', 'EXAM', 'STUDYING', 'LIBRARY', 'CAFETERIA', 'NOTEBOOK',
  'CLASSROOM', 'ASSIGNMENT', 'SEMESTER', 'SCHOLARSHIP', 'LABORATORY', 'GRADUATION',
  'PROFESSOR', 'TEXTBOOK', 'TIMETABLE', 'RESEARCH', 'STUDENT', 'COLLEGE', 'FRIENDSHIP',
  'CANTEEN', 'PROJECT', 'SCIENCE', 'HISTORY', 'CULTURE', 'SOCCER', 'DEBATE', 'FESTIVAL',
  'WORKSHOP', 'MATRICULATION', 'COMMUNITY', 'LEARNING', 'EDUCATION', 'EXERCISE',
];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function seededRandom(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: T[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createDailyPuzzle(date: string, difficulty: PuzzleDifficulty): DailyPuzzle {
  const config = puzzleDifficulties[difficulty];
  const random = seededRandom(`${date}:${difficulty}:schoomate-word-search-v1`);
  const words = shuffle(wordBank.filter((word) => word.length <= config.size), random)
    .slice(0, config.wordCount)
    .sort((first, second) => second.length - first.length);
  const cells = Array.from({ length: config.size }, () => Array<string>(config.size).fill(''));
  const placements: Record<string, PuzzleCell[]> = {};

  let generationFailed = false;
  for (const word of words) {
    let placed: PuzzleCell[] | null = null;
    for (let attempt = 0; attempt < 2000 && !placed; attempt += 1) {
      const [deltaRow, deltaColumn] = config.directions[Math.floor(random() * config.directions.length)];
      const row = Math.floor(random() * config.size);
      const column = Math.floor(random() * config.size);
      const path = Array.from({ length: word.length }, (_, index) => ({
        row: row + deltaRow * index,
        column: column + deltaColumn * index,
      }));
      if (path.some((cell, index) => (
        cell.row < 0 || cell.row >= config.size
        || cell.column < 0 || cell.column >= config.size
        || (cells[cell.row][cell.column] !== '' && cells[cell.row][cell.column] !== word[index])
      ))) continue;

      path.forEach((cell, index) => {
        cells[cell.row][cell.column] = word[index];
      });
      placed = path;
    }
    if (!placed) {
      generationFailed = true;
      break;
    }
    placements[word] = placed;
  }

  if (generationFailed) {
    for (const row of cells) row.fill('');
    for (const word of words.entries()) {
      const [index, value] = word;
      const reverse = random() < 0.5;
      const path = Array.from({ length: value.length }, (_, offset) => ({
        row: index,
        column: reverse ? value.length - offset - 1 : offset,
      }));
      path.forEach((cell, offset) => {
        cells[cell.row][cell.column] = value[offset];
      });
      placements[value] = path;
    }
  }

  for (let row = 0; row < config.size; row += 1) {
    for (let column = 0; column < config.size; column += 1) {
      if (!cells[row][column]) {
        cells[row][column] = alphabet[Math.floor(random() * alphabet.length)];
      }
    }
  }

  return { date, difficulty, grid: cells.map((row) => row.join('')), words, placements };
}

export function validateWordPaths(puzzle: DailyPuzzle, paths: WordPath[]): boolean {
  if (paths.length !== puzzle.words.length) return false;
  const submittedWords = new Set<string>();

  for (const path of paths) {
    if (!puzzle.words.includes(path.word) || submittedWords.has(path.word)) return false;
    if (path.cells.length !== path.word.length || path.cells.length < 2) return false;
    const first = path.cells[0];
    const second = path.cells[1];
    const deltaRow = second.row - first.row;
    const deltaColumn = second.column - first.column;
    if (
      (deltaRow === 0 && deltaColumn === 0)
      || Math.abs(deltaRow) > 1
      || Math.abs(deltaColumn) > 1
    ) return false;

    const letters = path.cells.map((cell, index) => {
      if (
        !Number.isInteger(cell.row) || !Number.isInteger(cell.column)
        || cell.row < 0 || cell.row >= puzzle.grid.length
        || cell.column < 0 || cell.column >= puzzle.grid.length
      ) return '';
      if (index > 0 && (
        cell.row !== first.row + deltaRow * index
        || cell.column !== first.column + deltaColumn * index
      )) return '';
      return puzzle.grid[cell.row][cell.column];
    }).join('');

    if (letters !== path.word && [...letters].reverse().join('') !== path.word) return false;
    submittedWords.add(path.word);
  }

  return puzzle.words.every((word) => submittedWords.has(word));
}

export function calculatePuzzleScore(
  difficulty: PuzzleDifficulty,
  elapsedSeconds: number,
  hintsUsed: number,
) {
  const baseScore = puzzleDifficulties[difficulty].baseScore;
  const timeBonus = Math.max(0, 300 - Math.floor(elapsedSeconds / 10) * 5);
  const hintPenalty = Math.min(hintsUsed, 6) * 50;
  return Math.max(0, baseScore + timeBonus - hintPenalty);
}

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function findWordPath(puzzle: DailyPuzzle, word: string): PuzzleCell[] {
  return puzzle.placements[word] ?? [];
}
