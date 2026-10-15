import type { LeaderboardCategory, LeaderboardEntry, RecognitionMetrics } from '../types/domain';
import { calculateRecognitionScore, getRecognitionTitle } from '../services/recognition';

export const previewRecognitionMetrics: RecognitionMetrics = {
  approvedOriginalPosts: 6,
  meaningfulReplies: 12,
  uniqueEngagers: 20,
  positiveContributions: 2,
  gameAchievements: 3,
  activeWeeks: 5,
};

const previewEntry = (
  id: string,
  displayName: string,
  score: number,
  category: LeaderboardCategory,
  badge?: string,
): LeaderboardEntry => ({
  id,
  displayName,
  score,
  category,
  title: getRecognitionTitle(score).name,
  badge,
});

export const previewLeaderboard: LeaderboardEntry[] = [
  previewEntry('member-1', 'Amara O.', 960, 'overall', 'Creator of the Week'),
  previewEntry('member-2', 'Tobi K.', 840, 'overall', 'Community Contributor'),
  previewEntry('member-3', 'Zara A.', 760, 'overall', 'Trivia Champion'),
  previewEntry('member-4', 'Daniel E.', 640, 'overall', 'Puzzle Champion'),
  previewEntry('member-5', 'Muna S.', 520, 'overall'),
  previewEntry('member-6', 'Gideon I.', calculateRecognitionScore(previewRecognitionMetrics), 'overall'),
  previewEntry('creator-1', 'Amara O.', 960, 'creators', 'Creator of the Week'),
  previewEntry('creator-2', 'Zara A.', 760, 'creators'),
  previewEntry('creator-3', 'Tobi K.', 690, 'creators'),
  previewEntry('contributor-1', 'Tobi K.', 840, 'contributors', 'Community Contributor'),
  previewEntry('contributor-2', 'Muna S.', 620, 'contributors'),
  previewEntry('contributor-3', 'Gideon I.', calculateRecognitionScore(previewRecognitionMetrics), 'contributors'),
  previewEntry('game-1', 'Zara A.', 760, 'games', 'Trivia Champion'),
  previewEntry('game-2', 'Daniel E.', 640, 'games', 'Puzzle Champion'),
  previewEntry('game-3', 'Amara O.', 610, 'games'),
];
