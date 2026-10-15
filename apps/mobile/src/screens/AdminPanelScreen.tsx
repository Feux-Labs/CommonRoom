import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertTriangle, ArrowLeft, Check, Megaphone, Send, ShieldAlert, Trash2, Users } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type AdminPanelScreenProps = {
  onBack: () => void;
};

type FlaggedReport = {
  id: string;
  targetType: 'post' | 'comment' | 'listing';
  author: string;
  reason: string;
  contentSnippet: string;
  time: string;
};

const initialReports: FlaggedReport[] = [
  {
    id: 'r1',
    targetType: 'listing',
    author: 'anonymous_seller_99',
    reason: 'Suspiciously low price / suspected scam',
    contentSnippet: 'Selling brand new iPhone 15 Pro for ₦50,000 pay upfront only.',
    time: '15m ago',
  },
  {
    id: 'r2',
    targetType: 'post',
    author: 'spammer_user',
    reason: 'Spam link repetition',
    contentSnippet: 'Join this WhatsApp group for exam leak answers: http://bit.ly/fakeexam',
    time: '1h ago',
  },
];

export function AdminPanelScreen({ onBack }: AdminPanelScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [reports, setReports] = useState<FlaggedReport[]>(initialReports);
  const [broadcastText, setBroadcastText] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(
    'Reminder: Final semester exam timetable is out on the portal. Study hard!'
  );
  const [notice, setNotice] = useState<string | null>(null);

  const handleResolve = (id: string, action: 'keep' | 'delete') => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    setNotice(action === 'delete' ? 'Content removed by moderator.' : 'Report dismissed.');
    setTimeout(() => setNotice(null), 3000);
  };

  const handlePublishBroadcast = () => {
    if (!broadcastText.trim()) return;
    setActiveBroadcast(broadcastText.trim());
    setBroadcastText('');
    setNotice('Campus broadcast announcement updated live.');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Admin & Moderator Panel</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notice */}
        {notice ? (
          <View style={styles.feedbackNotice}>
            <Text style={styles.feedbackNoticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* Quick Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>1,420</Text>
            <Text style={styles.metricLabel}>Active Students</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{reports.length}</Text>
            <Text style={styles.metricLabel}>Pending Flags</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>99.4%</Text>
            <Text style={styles.metricLabel}>Safety Score</Text>
          </View>
        </View>

        {/* Broadcast Announcement */}
        <Text style={styles.sectionTitle}>Campus Broadcast Banner</Text>
        <View style={styles.card}>
          {activeBroadcast ? (
            <View style={styles.activeBanner}>
              <Megaphone size={16} color="#f59e0b" />
              <Text style={styles.activeBannerText}>{activeBroadcast}</Text>
            </View>
          ) : null}
          <TextInput
            multiline
            maxLength={280}
            onChangeText={setBroadcastText}
            placeholder="Type a campus-wide broadcast announcement…"
            placeholderTextColor="#8e95a5"
            style={styles.input}
            value={broadcastText}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!broadcastText.trim()}
            onPress={handlePublishBroadcast}
            style={[styles.primaryBtn, !broadcastText.trim() && styles.primaryBtnDisabled]}
          >
            <Send size={13} color={broadcastText.trim() ? '#000000' : '#8e95a5'} />
            <Text style={[styles.primaryBtnText, !broadcastText.trim() && styles.primaryBtnTextDisabled]}>
              Publish Announcement
            </Text>
          </Pressable>
        </View>

        {/* Flagged Queue */}
        <Text style={styles.sectionTitle}>Reported Content Queue ({reports.length})</Text>
        {reports.length > 0 ? (
          reports.map((report) => (
            <View key={report.id} style={styles.reportItem}>
              <View style={styles.reportTop}>
                <View style={styles.reportBadge}>
                  <AlertTriangle size={12} color="#ef4444" />
                  <Text style={styles.reportBadgeText}>{report.reason}</Text>
                </View>
                <Text style={styles.reportTime}>{report.time}</Text>
              </View>
              <Text style={styles.reportSnippet}>“{report.contentSnippet}”</Text>
              <Text style={styles.reportAuthor}>Reported user: @{report.author}</Text>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleResolve(report.id, 'keep')}
                  style={styles.keepBtn}
                >
                  <Check size={14} color="#10b981" />
                  <Text style={styles.keepText}>Dismiss Report</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleResolve(report.id, 'delete')}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={14} color="#ef4444" />
                  <Text style={styles.deleteText}>Delete & Warn</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <ShieldAlert size={36} color="#10b981" />
            <Text style={styles.emptyTitle}>Queue Clean!</Text>
            <Text style={styles.emptySubtitle}>No pending flagged posts or student reports at this time.</Text>
          </View>
        )}
      </ScrollView>
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
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  feedbackNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    marginBottom: 14,
    padding: 10,
  },
  feedbackNoticeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  metricNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  activeBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 10,
  },
  activeBannerText: {
    color: '#f59e0b',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 12,
    minHeight: 60,
    padding: 10,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryBtnTextDisabled: {
    color: '#8e95a5',
  },
  reportItem: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  reportTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reportBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
  },
  reportTime: {
    color: '#64748b',
    fontSize: 10,
  },
  reportSnippet: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  reportAuthor: {
    color: '#8e95a5',
    fontSize: 11,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keepBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  keepText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#8e95a5',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
