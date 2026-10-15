import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { previewLeaderboard, previewRecognitionMetrics } from '../data/recognitionData';
import { calculateRecognitionScore, getNextRecognitionTitle, getRecognitionTitle, recognitionPolicy } from '../services/recognition';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { LeaderboardCategory, RecognitionMetrics, UserProfile } from '../types/domain';

type RecognitionScreenProps = {
  onBack: () => void;
  profile?: UserProfile | null;
};

const categories: { key: LeaderboardCategory; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'creators', label: 'Creators' },
  { key: 'contributors', label: 'Community' },
  { key: 'games', label: 'Games' },
];

const metricValues = [
  { key: 'approvedOriginalPosts', label: 'Approved original posts' },
  { key: 'meaningfulReplies', label: 'Meaningful conversations' },
  { key: 'uniqueEngagers', label: 'Unique people engaging' },
  { key: 'positiveContributions', label: 'Positive contributions' },
  { key: 'gameAchievements', label: 'Game achievements' },
  { key: 'activeWeeks', label: 'Active weeks' },
] as const;

const previewBadges = ['Community Contributor', 'Trivia Champion'];

const emptyMetrics: RecognitionMetrics = {
  approvedOriginalPosts: 0,
  meaningfulReplies: 0,
  uniqueEngagers: 0,
  positiveContributions: 0,
  gameAchievements: 0,
  activeWeeks: 0,
};

export function RecognitionScreen({ onBack, profile }: RecognitionScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [category, setCategory] = useState<LeaderboardCategory>('overall');
  const metrics = profile ? emptyMetrics : previewRecognitionMetrics;
  const score = profile?.recognition.score ?? calculateRecognitionScore(metrics);
  const scoreTitle = getRecognitionTitle(score);
  const currentTitle = profile
    ? { ...scoreTitle, name: profile.recognition.title }
    : scoreTitle;
  const nextTitle = getNextRecognitionTitle(score);
  const badges = profile?.recognition.badges ?? previewBadges;
  const progress = nextTitle
    ? Math.min(1, (score - currentTitle.threshold) / (nextTitle.threshold - currentTitle.threshold))
    : 1;
  const entries = [
    ...previewLeaderboard.filter((entry) => entry.category === category && (!profile || entry.displayName !== 'Gideon I.')),
    ...(profile && (category === 'overall' || category === 'contributors')
      ? [{
        id: 'current-user',
        displayName: profile.displayName,
        title: profile.recognition.title,
        score: profile.recognition.score,
        category,
      }]
      : []),
  ]
    .sort((first, second) => second.score - first.score);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Room" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Recognition</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewBanner}>
          <Text style={styles.previewLabel}>PREVIEW DATA · NOT A LIVE RANKING</Text>
          <Text style={styles.previewCopy}>Recognition is not connected to a verified server. Sample rankings and badges are illustrative only.</Text>
        </View>

        <View style={styles.titleCard}>
          <Text style={styles.eyebrow}>YOUR COMMON ROOM TITLE</Text>
          <Text style={styles.titleName}>{currentTitle.name}</Text>
          <Text style={styles.score}>{score} recognition points</Text>
          {nextTitle ? (
            <>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <Text style={styles.nextTitle}>{nextTitle.threshold - score} points to {nextTitle.name}</Text>
            </>
          ) : <Text style={styles.nextTitle}>Highest title reached</Text>}
        </View>

        <Text style={styles.sectionTitle}>Recognition badges</Text>
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>How recognition is earned</Text>
        <Text style={styles.helper}>A rolling {recognitionPolicy.rollingWindowDays}-day score is refreshed {recognitionPolicy.refreshCadence.toLowerCase()}. It rewards varied, meaningful contributions—not raw post or like counts.</Text>
        <View style={styles.metricsCard}>
          {metricValues.map((metric) => {
            const rule = recognitionPolicy.scoring[metric.key];
            const count = metrics[metric.key];
            const points = Math.min(rule.cap, count) * rule.points;
            return (
              <View key={metric.key} style={styles.metricRow}>
                <View style={styles.metricCopy}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricDetail}>{Math.min(count, rule.cap)} counted · max {rule.cap} per window</Text>
                </View>
                <Text style={styles.metricPoints}>+{points}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Individual leaderboard</Text>
        <Text style={styles.helper}>People are ranked across Common Room, never by school. Public ranking eligibility: {recognitionPolicy.publicLeaderboardEligibility.join(', ')}.</Text>
        <ScrollView contentContainerStyle={styles.categoryRow} horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((item) => {
            const selected = category === item.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item.key}
                onPress={() => setCategory(item.key)}
                style={[styles.categoryChip, selected && styles.categoryChipSelected]}
              >
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.leaderboard}>
          {entries.map((entry, index) => (
            <View key={entry.id} style={styles.leaderRow}>
              <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{entry.displayName}</Text>
                <Text style={styles.memberTitle}>{entry.title}{entry.badge ? ` · ${entry.badge}` : ''}</Text>
              </View>
              <Text style={styles.memberScore}>{entry.score}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Anti-abuse safeguards</Text>
        <View style={styles.safeguards}>
          {recognitionPolicy.antiAbuse.map((rule) => (
            <Text key={rule} style={styles.safeguard}>• {rule}</Text>
          ))}
        </View>
        <Text style={styles.footerNote}>Recognition is separate from education status. Anonymous posts and comments never contribute to public rank or reveal a member's title.</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28, marginTop: -3 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  headerSpacer: { width: 36 },
  content: { gap: 12, paddingBottom: 32, paddingHorizontal: 16, paddingTop: 14 },
  previewBanner: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
  },
  previewLabel: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  previewCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  titleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  titleName: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 8 },
  score: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  progressTrack: { backgroundColor: colors.surfaceSoft, borderRadius: radius.pill, height: 8, marginTop: 14, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.text, borderRadius: radius.pill, height: '100%' },
  nextTitle: { color: colors.textMuted, fontSize: 10, marginTop: 7 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 6 },
  helper: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  badge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  metricsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  metricRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  metricCopy: { flex: 1, paddingVertical: 8 },
  metricLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },
  metricDetail: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  metricPoints: { color: colors.text, fontSize: 12, fontWeight: '900', paddingLeft: 10 },
  categoryRow: { gap: 7, paddingVertical: 2 },
  categoryChip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  categoryChipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  categoryText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  categoryTextSelected: { color: colors.inverse },
  leaderboard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  leaderRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
  },
  rank: { color: colors.textMuted, fontSize: 11, fontWeight: '900', width: 24 },
  memberInfo: { flex: 1 },
  memberName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  memberTitle: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  memberScore: { color: colors.text, fontSize: 11, fontWeight: '900' },
  safeguards: { backgroundColor: colors.surface, borderRadius: radius.md, gap: 8, padding: 12 },
  safeguard: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  footerNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, paddingVertical: 6 },
});
