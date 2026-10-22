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
import { ArrowLeft, ChevronDown, ChevronUp, CircleQuestionMark, Mail, MessageSquare, Send, ShieldCheck } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type HelpSupportScreenProps = {
  onBack: () => void;
};

const faqs = [
  {
    q: 'How does Connect work?',
    a: 'Connect helps students from the same and neighboring campuses find people with shared study interests and vibes. Mutual connections can send direct messages without sharing personal phone numbers.',
  },
  {
    q: 'How is my privacy protected in Anonymous posts?',
    a: 'Anonymous posts do not display your real name, username, or profile photo. A dynamic anonymous alias (e.g., Ghost 4812) is assigned per thread so your identity stays private.',
  },
  {
    q: 'How do I earn Aura and level up my Campus Status?',
    a: 'You gain Aura points by posting quality content, answering fellow students’ questions, and receiving upvotes. Tiers range from Common Newcomer all the way to Common President.',
  },
  {
    q: 'How do marketplace transactions work?',
    a: 'Commonroom Marketplace is for peer-to-peer campus buying and selling. Always meet in safe, public daytime campus locations (like the library or student union) to inspect items.',
  },
];

export function HelpSupportScreen({ onBack }: HelpSupportScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSendReport = () => {
    if (!reportText.trim()) return;
    setReportSubmitted(true);
    setReportText('');
    setTimeout(() => setReportSubmitted(false), 4000);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Safety Banner */}
        <View style={styles.safetyCard}>
          <ShieldCheck size={20} color="#10b981" />
          <View style={styles.safetyTextWrap}>
            <Text style={styles.safetyTitle}>Campus Safety & Trust</Text>
            <Text style={styles.safetyDesc}>
              Commonroom is built for authentic, supportive student communities. Harassment, scams, or hate speech are immediately moderated.
            </Text>
          </View>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <Pressable
                key={faq.q}
                accessibilityRole="button"
                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                style={styles.faqItem}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  {isExpanded ? <ChevronUp size={16} color="#8e95a5" /> : <ChevronDown size={16} color="#8e95a5" />}
                </View>
                {isExpanded ? <Text style={styles.faqAnswer}>{faq.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Report an Issue Form */}
        <Text style={styles.sectionTitle}>Report an Issue or Suggestion</Text>
        <View style={styles.reportCard}>
          <Text style={styles.reportCardLabel}>Tell the Commonroom Moderator Team:</Text>
          <TextInput
            multiline
            numberOfLines={4}
            maxLength={1000}
            onChangeText={setReportText}
            placeholder="Describe what happened or a feature you would love to see…"
            placeholderTextColor="#8e95a5"
            style={styles.reportInput}
            value={reportText}
          />
          {reportSubmitted ? (
            <View style={styles.feedbackSuccess}>
              <Text style={styles.feedbackSuccessText}>✓ Report submitted. Thank you for keeping our community safe!</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!reportText.trim()}
            onPress={handleSendReport}
            style={[styles.submitBtn, !reportText.trim() && styles.submitBtnDisabled]}
          >
            <Send size={14} color={reportText.trim() ? '#000000' : '#8e95a5'} />
            <Text style={[styles.submitBtnText, !reportText.trim() && styles.submitBtnTextDisabled]}>
              Submit to Moderators
            </Text>
          </Pressable>
        </View>

        {/* Contact info */}
        <View style={styles.contactRow}>
          <Mail size={15} color="#8e95a5" />
          <Text style={styles.contactText}>support@commonroom.app</Text>
        </View>
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
  safetyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 14,
  },
  safetyTextWrap: {
    flex: 1,
  },
  safetyTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
  },
  safetyDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  sectionTitle: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  faqList: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  faqHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  reportCard: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  reportCardLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reportInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 12,
    minHeight: 80,
    padding: 10,
    textAlignVertical: 'top',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  feedbackSuccessText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  submitBtnTextDisabled: {
    color: '#8e95a5',
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 24,
  },
  contactText: {
    color: '#8e95a5',
    fontSize: 11,
  },
});
