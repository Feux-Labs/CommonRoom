import { useState, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TopBar } from '../components/TopBar';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import {
  CheckCircle2,
  Filter,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react-native/icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MeetScreenProps = {
  onMenuPress: () => void;
  onOpenMessages?: (userId: string, userName: string) => void;
};

type MeetProfile = {
  id: string;
  name: string;
  age: number;
  school: string;
  course: string;
  year: string;
  distance: string;
  bio: string;
  prompts: { q: string; a: string }[];
  interests: string[];
  vibe: string;
  online: boolean;
  avatarColor: string;
};

const initialProfiles: MeetProfile[] = [
  {
    id: 'meet-1',
    name: 'Aisha Bello',
    age: 20,
    school: 'University of Lagos (UNILAG)',
    course: 'Computer Science',
    year: '300 Level',
    distance: '0.4 km away',
    bio: 'Tech enthusiast, late-night hackathons, and finding the best jollof spot around campus.',
    prompts: [
      { q: 'My typical campus weekend', a: 'Building side projects or chilling by the lagoon front.' },
      { q: 'The way to win me over', a: 'Send good music playlists and iced matcha lattes.' },
    ],
    interests: ['Coding', 'Design', 'Afrobeats', 'Podcasts', 'Matcha'],
    vibe: 'Tech & Chill',
    online: true,
    avatarColor: '#6366f1',
  },
  {
    id: 'meet-2',
    name: 'Tobi Adebayo',
    age: 22,
    school: 'Bells University of Technology',
    course: 'Architecture',
    year: '400 Level',
    distance: '1.2 km away',
    bio: 'Sketching building concepts, weekend basketball, and debating sci-fi movie endings.',
    prompts: [
      { q: 'Favorite spot on campus', a: 'The rooftop studio at sunset.' },
      { q: 'Unpopular campus opinion', a: '8 AM lectures build true character.' },
    ],
    interests: ['Architecture', 'Basketball', 'Film', 'Photography', 'Coffee'],
    vibe: 'Creative & Sporty',
    online: true,
    avatarColor: '#ec4899',
  },
  {
    id: 'meet-3',
    name: 'Chioma Okeke',
    age: 21,
    school: 'Covenant University',
    course: 'Economics',
    year: '300 Level',
    distance: '2.5 km away',
    bio: 'Investment analysis by day, acoustic indie vibes by night. Always down for campus debates.',
    prompts: [
      { q: 'My biggest green flag', a: 'I return borrowed books in pristine condition.' },
    ],
    interests: ['Economics', 'Debate', 'Acoustic', 'Chess', 'Reading'],
    vibe: 'Ambitious & Mindful',
    online: false,
    avatarColor: '#10b981',
  },
  {
    id: 'meet-4',
    name: 'David Oladipo',
    age: 23,
    school: 'University of Ibadan (UI)',
    course: 'Mechanical Engineering',
    year: 'Final Year',
    distance: '3.1 km away',
    bio: 'Formula student builder, photography hobbyist, and connoisseur of campus street food.',
    prompts: [
      { q: 'Best piece of college advice', a: 'Get your sleep cycle sorted before exam week.' },
    ],
    interests: ['Engineering', 'Cars', 'Photography', 'Gaming', 'Gym'],
    vibe: 'Builder & Explorer',
    online: true,
    avatarColor: '#f59e0b',
  },
];

export function MeetScreen({ onMenuPress, onOpenMessages }: MeetScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'discover' | 'connections'>('discover');
  const [profiles, setProfiles] = useState<MeetProfile[]>(initialProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connections, setConnections] = useState<MeetProfile[]>([]);
  const [matchedProfile, setMatchedProfile] = useState<MeetProfile | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [notice, setNotice] = useState<string | null>(null);

  const currentProfile = profiles[currentIndex] ?? null;

  const handlePass = () => {
    if (currentIndex < profiles.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleConnect = (profile: MeetProfile, isSuper = false) => {
    if (!connections.some((c) => c.id === profile.id)) {
      setConnections((prev) => [profile, ...prev]);
    }
    // Simulate mutual match
    setMatchedProfile(profile);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleReset = () => {
    setCurrentIndex(0);
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Meet" onMenuPress={onMenuPress} />

      {/* Top Secondary Segment Control */}
      <View style={styles.topBarSegment}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('discover')}
          style={[styles.segmentBtn, activeTab === 'discover' && styles.segmentBtnActive]}
        >
          <Sparkles size={14} color={activeTab === 'discover' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.segmentText, activeTab === 'discover' && styles.segmentTextActive]}>
            Discover
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('connections')}
          style={[styles.segmentBtn, activeTab === 'connections' && styles.segmentBtnActive]}
        >
          <Users size={14} color={activeTab === 'connections' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.segmentText, activeTab === 'connections' && styles.segmentTextActive]}>
            Connections {connections.length > 0 ? `(${connections.length})` : ''}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Filter preferences"
          accessibilityRole="button"
          onPress={() => setFilterModalOpen(true)}
          style={styles.filterBtn}
        >
          <Filter size={15} color={colors.text} />
        </Pressable>
      </View>

      {/* Discover View */}
      {activeTab === 'discover' ? (
        <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {currentProfile ? (
            <View style={styles.cardContainer}>
              {/* Profile Card */}
              <View style={styles.profileCard}>
                {/* Header Banner */}
                <View style={[styles.cardBanner, { backgroundColor: currentProfile.avatarColor }]}>
                  <View style={styles.bannerBadge}>
                    <Zap size={12} color="#ffffff" />
                    <Text style={styles.bannerBadgeText}>{currentProfile.vibe}</Text>
                  </View>
                  {currentProfile.online ? (
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Active now</Text>
                    </View>
                  ) : null}
                  <Text style={styles.avatarInitial}>{currentProfile.name.charAt(0)}</Text>
                </View>

                {/* Identity info */}
                <View style={styles.cardBody}>
                  <View style={styles.identityRow}>
                    <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                    <CheckCircle2 size={16} color="#3b82f6" />
                  </View>
                  <Text style={styles.schoolInfo}>
                    {currentProfile.course} · {currentProfile.year}
                  </Text>
                  <View style={styles.distanceRow}>
                    <MapPin size={13} color="#8e95a5" />
                    <Text style={styles.distanceText}>{currentProfile.school} ({currentProfile.distance})</Text>
                  </View>

                  <Text style={styles.bio}>{currentProfile.bio}</Text>

                  {/* Vibe Tags */}
                  <View style={styles.tagsWrap}>
                    {currentProfile.interests.map((interest) => (
                      <View key={interest} style={styles.tagPill}>
                        <Text style={styles.tagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Prompts */}
                  {currentProfile.prompts.map((p, idx) => (
                    <View key={idx} style={styles.promptCard}>
                      <Text style={styles.promptQuestion}>{p.q}</Text>
                      <Text style={styles.promptAnswer}>{p.a}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityLabel="Pass"
                    accessibilityRole="button"
                    onPress={handlePass}
                    style={[styles.actionRoundBtn, styles.passBtn]}
                  >
                    <X size={22} color="#ef4444" strokeWidth={2.6} />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Super Connect"
                    accessibilityRole="button"
                    onPress={() => handleConnect(currentProfile, true)}
                    style={[styles.actionRoundBtn, styles.starBtn]}
                  >
                    <Star size={20} color="#3b82f6" fill="#3b82f6" />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Connect"
                    accessibilityRole="button"
                    onPress={() => handleConnect(currentProfile, false)}
                    style={[styles.actionRoundBtn, styles.connectBtn]}
                  >
                    <Heart size={24} color="#ffffff" fill="#ffffff" />
                  </Pressable>
                </View>
              </View>

              {/* Safety note */}
              <View style={styles.safetyFootnote}>
                <ShieldCheck size={14} color="#8e95a5" />
                <Text style={styles.safetyText}>
                  Commonroom Meet respects student safety. Exact phone numbers and personal emails are never shared.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Flame size={44} color="#f59e0b" />
              <Text style={styles.emptyTitle}>You’ve seen all campus vibes!</Text>
              <Text style={styles.emptySubtitle}>
                Check back soon as more students join or reset to browse again.
              </Text>
              <Pressable accessibilityRole="button" onPress={handleReset} style={styles.resetBtn}>
                <RotateCcw size={15} color="#000000" />
                <Text style={styles.resetBtnText}>Browse again</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Connections View */
        <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {connections.length > 0 ? (
            <View style={styles.connectionsList}>
              <Text style={styles.connectionsHeading}>Your Mutual Connections</Text>
              {connections.map((c) => (
                <View key={c.id} style={styles.connectionCard}>
                  <View style={[styles.connectionAvatar, { backgroundColor: c.avatarColor }]}>
                    <Text style={styles.connectionAvatarText}>{c.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{c.name}, {c.age}</Text>
                    <Text style={styles.connectionMeta}>{c.course} · {c.school}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Message ${c.name}`}
                    accessibilityRole="button"
                    onPress={() => {
                      if (onOpenMessages) {
                        onOpenMessages(c.id, c.name);
                      } else {
                        setNotice(`Opening chat with ${c.name}…`);
                      }
                    }}
                    style={styles.messageBtn}
                  >
                    <MessageCircle size={15} color="#000000" />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={40} color="#8e95a5" />
              <Text style={styles.emptyTitle}>No connections yet</Text>
              <Text style={styles.emptySubtitle}>
                Like profiles in the Discover tab to connect and start conversations!
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setActiveTab('discover')} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Go to Discover</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Connection Match Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(matchedProfile)}
        onRequestClose={() => setMatchedProfile(null)}
      >
        <View style={styles.matchBackdrop}>
          <View style={styles.matchBox}>
            <View style={styles.matchBadge}>
              <Sparkles size={20} color="#ffffff" />
            </View>
            <Text style={styles.matchTitle}>It’s a Connection!</Text>
            <Text style={styles.matchSubtitle}>
              You and <Text style={{ fontWeight: '800' }}>{matchedProfile?.name}</Text> both want to connect on Commonroom.
            </Text>
            <View style={styles.matchAvatarRow}>
              <View style={[styles.matchAvatar, { backgroundColor: '#6366f1' }]}>
                <Text style={styles.matchAvatarText}>You</Text>
              </View>
              <Heart size={24} color="#ec4899" fill="#ec4899" style={{ marginHorizontal: 12 }} />
              <View style={[styles.matchAvatar, { backgroundColor: matchedProfile?.avatarColor || '#10b981' }]}>
                <Text style={styles.matchAvatarText}>{matchedProfile?.name.charAt(0)}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const profile = matchedProfile;
                setMatchedProfile(null);
                if (profile && onOpenMessages) {
                  onOpenMessages(profile.id, profile.name);
                }
              }}
              style={styles.matchPrimaryBtn}
            >
              <Send size={15} color="#000000" />
              <Text style={styles.matchPrimaryText}>Send a message</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMatchedProfile(null)}
              style={styles.matchSecondaryBtn}
            >
              <Text style={styles.matchSecondaryText}>Keep Exploring</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={filterModalOpen}
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Meet Preferences</Text>
              <Pressable accessibilityRole="button" onPress={() => setFilterModalOpen(false)}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.filterSectionTitle}>Campus Vibe Filter</Text>
            <View style={styles.vibePillGrid}>
              {['All', 'Tech & Chill', 'Creative & Sporty', 'Ambitious & Mindful', 'Builder & Explorer'].map((vibe) => (
                <Pressable
                  key={vibe}
                  accessibilityRole="button"
                  onPress={() => setSelectedVibe(vibe)}
                  style={[styles.vibeFilterPill, selectedVibe === vibe && styles.vibeFilterPillActive]}
                >
                  <Text style={[styles.vibeFilterText, selectedVibe === vibe && styles.vibeFilterTextActive]}>
                    {vibe}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilterModalOpen(false)}
              style={styles.applyFilterBtn}
            >
              <Text style={styles.applyFilterBtnText}>Apply Preferences</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  topBarSegment: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  filterBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 34,
  },
  contentScroll: {
    paddingBottom: 110,
    paddingTop: 12,
  },
  cardContainer: {
    paddingHorizontal: 16,
  },
  profileCard: {
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardBanner: {
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
    position: 'relative',
  },
  bannerBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 12,
  },
  bannerBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  onlineBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  onlineDot: {
    backgroundColor: '#10b981',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  onlineText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '900',
    opacity: 0.9,
  },
  cardBody: {
    padding: 16,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  name: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  schoolInfo: {
    color: '#8e95a5',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  distanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  distanceText: {
    color: '#8e95a5',
    fontSize: 12,
  },
  bio: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  promptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  promptQuestion: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  promptAnswer: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  actionRoundBtn: {
    alignItems: 'center',
    borderRadius: 30,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  passBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  starBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    height: 48,
    width: 48,
  },
  connectBtn: {
    backgroundColor: '#ec4899',
    elevation: 4,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  safetyFootnote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  safetyText: {
    color: '#8e95a5',
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#8e95a5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  resetBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resetBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  connectionsList: {
    paddingHorizontal: 16,
  },
  connectionsHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  connectionCard: {
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  connectionAvatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  connectionAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  connectionName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  connectionMeta: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  messageBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messageBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  matchBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  matchBox: {
    alignItems: 'center',
    backgroundColor: '#151821',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    width: '100%',
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: '#ec4899',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginBottom: 14,
    width: 50,
  },
  matchTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  matchSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  matchAvatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 20,
  },
  matchAvatar: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  matchAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  matchPrimaryBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 12,
    width: '100%',
  },
  matchPrimaryText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  matchSecondaryBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  matchSecondaryText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#151821',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  filterSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterSheetTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  filterSectionTitle: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
    textTransform: 'uppercase',
  },
  vibePillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  vibeFilterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  vibeFilterPillActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  vibeFilterText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  vibeFilterTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  applyFilterBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    marginTop: 24,
    paddingVertical: 12,
  },
  applyFilterBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
