import type { RecognitionMetrics, RecognitionTitle } from '../types/domain';

export type RecognitionPolicy = {
  rollingWindowDays: number;
  refreshCadence: string;
  publicLeaderboardEligibility: readonly string[];
  scoring: Record<keyof RecognitionMetrics, { points: number; cap: number; label: string }>;
  titles: readonly RecognitionTitle[];
  antiAbuse: readonly string[];
};

export const recognitionPolicy: RecognitionPolicy = {
  rollingWindowDays: 90,
  refreshCadence: 'Weekly, Monday at 00:00 UTC',
  publicLeaderboardEligibility: [
    'Verified account',
    'Minimum age eligibility confirmed',
    'Account at least 30 days old',
    'Account in good standing',
  ],
  scoring: {
    approvedOriginalPosts: { points: 25, cap: 8, label: 'Approved original posts' },
    meaningfulReplies: { points: 8, cap: 25, label: 'Meaningful conversations' },
    uniqueEngagers: { points: 2, cap: 50, label: 'Unique people engaging' },
    positiveContributions: { points: 30, cap: 6, label: 'Positive community contributions' },
    gameAchievements: { points: 12, cap: 10, label: 'Game achievements' },
    activeWeeks: { points: 20, cap: 12, label: 'Consistent active weeks' },
  },
  titles: [
    { name: 'Common Newcomer', threshold: 0 },
    { name: 'Common Regular', threshold: 100 },
    { name: 'Common Contributor', threshold: 275 },
    { name: 'Common Leader', threshold: 475 },
    { name: 'Common Senator', threshold: 700 },
    { name: 'Common President', threshold: 925 },
  ],
  antiAbuse: [
    'Only server-verified and eligible activity contributes to score.',
    'Repeated activity with the same account or content is deduplicated.',
    'Each contribution type has a rolling-window cap.',
    'Self-engagement, coordinated manipulation, spam, removed content, and activity under review do not earn points.',
    'Abuse findings may remove points and temporarily exclude an account from public leaderboards.',
  ],
};

export function calculateRecognitionScore(
  metrics: RecognitionMetrics,
  policy: RecognitionPolicy = recognitionPolicy,
): number {
  return (
    cappedPoints(metrics.approvedOriginalPosts, policy.scoring.approvedOriginalPosts) +
    cappedPoints(metrics.meaningfulReplies, policy.scoring.meaningfulReplies) +
    cappedPoints(metrics.uniqueEngagers, policy.scoring.uniqueEngagers) +
    cappedPoints(metrics.positiveContributions, policy.scoring.positiveContributions) +
    cappedPoints(metrics.gameAchievements, policy.scoring.gameAchievements) +
    cappedPoints(metrics.activeWeeks, policy.scoring.activeWeeks)
  );
}

export function getRecognitionTitle(
  score: number,
  policy: RecognitionPolicy = recognitionPolicy,
): RecognitionTitle {
  const nonNegativeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return [...policy.titles].reverse().find((title) => nonNegativeScore >= title.threshold)
    ?? policy.titles[0];
}

export function getNextRecognitionTitle(
  score: number,
  policy: RecognitionPolicy = recognitionPolicy,
): RecognitionTitle | null {
  const nonNegativeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return policy.titles.find((title) => title.threshold > nonNegativeScore) ?? null;
}

function cappedPoints(value: number, rule: { points: number; cap: number }): number {
  const eligibleCount = Number.isFinite(value) ? Math.min(rule.cap, Math.max(0, Math.floor(value))) : 0;
  return eligibleCount * rule.points;
}
