import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Award, CheckCircle2, ChevronRight, Crown, Flame, Shield, Sparkles, Star, Trophy, Users, Zap } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { UserProfile } from '../types/domain';

type StatusScreenProps = {
  onBack: () => void;
  profile?: UserProfile | null;
};

type LeaderboardStudent = {
  rank: number;
  name: string;
  handle: string;
  school: string;
  title: string;
  auraScore: number;
  avatarColor: string;
};

const topLeaderboard: LeaderboardStudent[] = [
  { rank: 1, name: 'Gideon Ibitoye', handle: 'gideon_ibitoye', school: 'UNILAG', title: 'Common President', auraScore: 980, avatarColor: '#6366f1' },
  { rank: 2, name: 'Aisha Bello', handle: 'aisha_cs', school: 'UNILAG', title: 'Common Senator', auraScore: 840, avatarColor: '#ec4899' },
  { rank: 3, name: 'Tobi Adebayo', handle: 'tobi_arch', school: 'Bells Tech', title: 'Common Leader', auraScore: 620, avatarColor: '#10b981' },
  { rank: 4, name: 'Chioma Okeke', handle: 'chioma_eco', school: 'Covenant Univ', title: 'Common Leader', auraScore: 575, avatarColor: '#f59e0b' },
  { rank: 5, name: 'David Oladipo', handle: 'david_eng', school: 'Univ of Ibadan', title: 'Common Contributor', auraScore: 420, avatarColor: '#8b5cf6' },
];

const tiers = [
  { name: 'Common Newcomer', points: '0 - 99', desc: 'Starting your campus journey' },
  { name: 'Common Regular', points: '100 - 274', desc: 'Consistently engaging and sharing' },
  { name: 'Common Contributor', points: '275 - 474', desc: 'Helpful answers and popular posts' },
  { name: 'Common Leader', points: '475 - 699', desc: 'Shaping campus conversations' },
  { name: 'Common Senator', points: '700 - 924', desc: 'Respected campus voice & creator' },
  { name: 'Common President', points: '925+', desc: 'Legendary campus community status' },
];

const badges = [
  { title: 'Campus Pioneer', icon: Sparkles, color: '#f59e0b', desc: 'One of the first 100 students on campus' },
  { title: 'Night Owl', icon: Flame, color: '#ec4899', desc: 'Active in midnight study & late chats' },
  { title: 'Top Creator', icon: Star, color: '#6366f1', desc: 'Created 20+ high-engagement posts' },
  { title: 'Verified Student', icon: Shield, color: '#10b981', desc: 'Campus community verified' },
];

export function StatusScreen({ onBack, profile }: StatusScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'my_status' | 'leaderboard'>('my_status');

  const currentAura = profile?.recognition.score ?? 540;
  const currentTitle = profile?.recognition.title ?? 'Common Leader';

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Status & Aura</Text>
        <View style={styles.auraChip}>
          <Zap size={13} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.auraChipText}>{currentAura} Aura</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('my_status')}
          style={[styles.tabBtn, activeTab === 'my_status' && styles.tabBtnActive]}
        >
          <Trophy size={14} color={activeTab === 'my_status' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.tabText, activeTab === 'my_status' && styles.tabTextActive]}>
            My Status
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('leaderboard')}
          style={[styles.tabBtn, activeTab === 'leaderboard' && styles.tabBtnActive]}
        >
          <Crown size={14} color={activeTab === 'leaderboard' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            Campus Leaderboard
          </Text>
        </Pressable>
      </View>

      {activeTab === 'my_status' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Status Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTrophy}>
              <Crown size={32} color="#f59e0b" />
            </View>
            <Text style={styles.heroTitle}>{currentTitle}</Text>
            <Text style={styles.heroSubtitle}>
              You’re in the top 5% of active contributors across your school!
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>Tier Progress to Senator</Text>
                <Text style={styles.progressScore}>{currentAura} / 700 Aura</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (currentAura / 700) * 100)}%` }]} />
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.heroStatsGrid}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>14</Text>
                <Text style={styles.heroStatLabel}>Day Streak 🔥</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>#3</Text>
                <Text style={styles.heroStatLabel}>Campus Rank 🏆</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>4</Text>
                <Text style={styles.heroStatLabel}>Badges Earned ⭐</Text>
              </View>
            </View>
          </View>

          {/* Badges Section */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Earned Badges</Text>
            <View style={styles.badgeGrid}>
              {badges.map((b) => {
                const Icon = b.icon;
                return (
                  <View key={b.title} style={styles.badgeCard}>
                    <View style={[styles.badgeIconWrap, { backgroundColor: b.color }]}>
                      <Icon size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.badgeCardTitle}>{b.title}</Text>
                    <Text style={styles.badgeCardDesc}>{b.desc}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tiers Roadmap */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Status Tiers</Text>
            {tiers.map((t, idx) => {
              const isCurrent = t.name === currentTitle;
              return (
                <View key={t.name} style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}>
                  <View style={[styles.tierDot, isCurrent && styles.tierDotCurrent]}>
                    <Text style={styles.tierIndex}>{idx + 1}</Text>
                  </View>
                  <View style={styles.tierInfo}>
                    <View style={styles.tierTitleRow}>
                      <Text style={[styles.tierName, isCurrent && styles.tierNameCurrent]}>{t.name}</Text>
                      {isCurrent ? <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>You</Text></View> : null}
                    </View>
                    <Text style={styles.tierDesc}>{t.desc}</Text>
                  </View>
                  <Text style={styles.tierPoints}>{t.points}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* Leaderboard View */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.leaderboardList}>
            <Text style={styles.sectionHeader}>Top Campus Students</Text>
            {topLeaderboard.map((student) => (
              <View key={student.rank} style={styles.leaderRow}>
                <View style={[styles.rankBox, student.rank <= 3 && styles.rankBoxTop]}>
                  <Text style={[styles.rankText, student.rank <= 3 && styles.rankTextTop]}>
                    {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                  </Text>
                </View>
                <View style={[styles.leaderAvatar, { backgroundColor: student.avatarColor }]}>
                  <Text style={styles.leaderAvatarText}>{student.name.charAt(0)}</Text>
                </View>
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>{student.name}</Text>
                  <Text style={styles.leaderMeta}>@{student.handle} · {student.title}</Text>
                </View>
                <View style={styles.leaderAura}>
                  <Text style={styles.leaderAuraNum}>{student.auraScore}</Text>
                  <Text style={styles.leaderAuraLabel}>Aura</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginLeft: 8,
  },
  auraChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  auraChipText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 12,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 20,
  },
  heroTrophy: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 12,
    width: 60,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#8e95a5',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 18,
    width: '100%',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '600',
  },
  progressScore: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    height: '100%',
  },
  heroStatsGrid: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    paddingVertical: 12,
    width: '100%',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatNum: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 2,
  },
  heroStatDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: 24,
    width: 1,
  },
  sectionWrap: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  badgeIconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginBottom: 8,
    width: 32,
  },
  badgeCardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeCardDesc: {
    color: '#8e95a5',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  tierRow: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  tierRowCurrent: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  tierDot: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  tierDotCurrent: {
    backgroundColor: '#f59e0b',
  },
  tierIndex: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  tierInfo: {
    flex: 1,
    marginLeft: 10,
  },
  tierTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tierName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  tierNameCurrent: {
    color: '#f59e0b',
  },
  currentBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  currentBadgeText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  tierDesc: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  tierPoints: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardList: {
    paddingHorizontal: 16,
  },
  leaderRow: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  rankBox: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  rankBoxTop: {},
  rankText: {
    color: '#8e95a5',
    fontSize: 13,
    fontWeight: '800',
  },
  rankTextTop: {
    fontSize: 16,
  },
  leaderAvatar: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginLeft: 6,
    width: 36,
  },
  leaderAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  leaderName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  leaderMeta: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  leaderAura: {
    alignItems: 'flex-end',
  },
  leaderAuraNum: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '900',
  },
  leaderAuraLabel: {
    color: '#8e95a5',
    fontSize: 10,
  },
});
