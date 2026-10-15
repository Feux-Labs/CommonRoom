import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Check, Edit3, Grid, Heart, MapPin, Share2, Sparkles, Trophy, UserCheck, UserPlus, X } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { UserProfile } from '../types/domain';

type ProfileScreenProps = {
  onBack: () => void;
  profile?: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
};

export function ProfileScreen({ onBack, profile, onUpdateProfile }: ProfileScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'posts' | 'badges'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(1240);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit fields
  const [nameInput, setNameInput] = useState(profile?.displayName || 'Gideon Ibitoye');
  const [bioInput, setBioInput] = useState('Passionate about technology, campus initiatives, and building digital communities.');
  const [courseInput, setCourseInput] = useState('Computer Science');
  const [yearInput, setYearInput] = useState('300 Level');

  const toggleFollow = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      setFollowerCount((count) => (next ? count + 1 : count - 1));
      return next;
    });
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        displayName: nameInput,
      });
    }
    setEditModalOpen(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Student Profile</Text>
        <Pressable accessibilityRole="button" onPress={() => setEditModalOpen(true)} style={styles.editIconBtn}>
          <Edit3 size={15} color="#8e95a5" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner & Avatar */}
        <View style={styles.banner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nameInput.charAt(0)}</Text>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.infoWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{nameInput}</Text>
            <View style={styles.statusBadge}>
              <Trophy size={11} color="#f59e0b" />
              <Text style={styles.statusBadgeText}>Common Leader</Text>
            </View>
          </View>

          <Text style={styles.handle}>@{nameInput.toLowerCase().replace(/\s+/g, '_')}</Text>
          <Text style={styles.schoolRow}>
            {courseInput} · {yearInput} · {profile?.school || 'University of Lagos'}
          </Text>

          <Text style={styles.bioText}>{bioInput}</Text>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>24</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>892</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={toggleFollow}
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            >
              {isFollowing ? <UserCheck size={14} color="#ffffff" /> : <UserPlus size={14} color="#000000" />}
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditModalOpen(true)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Profile Tabs */}
        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab('posts')}
            style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
          >
            <Grid size={14} color={activeTab === 'posts' ? '#ffffff' : '#8e95a5'} />
            <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>Posts (24)</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab('badges')}
            style={[styles.tabBtn, activeTab === 'badges' && styles.tabBtnActive]}
          >
            <Sparkles size={14} color={activeTab === 'badges' ? '#ffffff' : '#8e95a5'} />
            <Text style={[styles.tabBtnText, activeTab === 'badges' && styles.tabBtnTextActive]}>Aura & Badges</Text>
          </Pressable>
        </View>

        {/* Content based on tab */}
        {activeTab === 'posts' ? (
          <View style={styles.postsList}>
            <View style={styles.postCard}>
              <Text style={styles.postCardTime}>Yesterday</Text>
              <Text style={styles.postCardBody}>
                Final year project prep is officially underway! What libraries are fellow CS students using for realtime state?
              </Text>
              <View style={styles.postCardMeta}>
                <Text style={styles.postCardStat}>❤️ 34 likes</Text>
                <Text style={styles.postCardStat}>💬 12 comments</Text>
              </View>
            </View>

            <View style={styles.postCard}>
              <Text style={styles.postCardTime}>3 days ago</Text>
              <Text style={styles.postCardBody}>
                Huge shoutout to the campus library staff for extending opening hours during midterm week.
              </Text>
              <View style={styles.postCardMeta}>
                <Text style={styles.postCardStat}>❤️ 62 likes</Text>
                <Text style={styles.postCardStat}>💬 8 comments</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.badgesList}>
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: '#f59e0b' }]}>
                <Sparkles size={16} color="#ffffff" />
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeName}>Campus Pioneer</Text>
                <Text style={styles.badgeDesc}>One of the earliest contributors to campus discussions.</Text>
              </View>
            </View>

            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: '#6366f1' }]}>
                <Trophy size={16} color="#ffffff" />
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeName}>Top Creator</Text>
                <Text style={styles.badgeDesc}>Earned 500+ upvotes across shared campus content.</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable accessibilityRole="button" onPress={() => setEditModalOpen(false)}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              onChangeText={setNameInput}
              value={nameInput}
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#8e95a5"
            />

            <Text style={styles.fieldLabel}>Course & Major</Text>
            <TextInput
              onChangeText={setCourseInput}
              value={courseInput}
              style={styles.input}
              placeholder="e.g. Computer Science"
              placeholderTextColor="#8e95a5"
            />

            <Text style={styles.fieldLabel}>Year of Study</Text>
            <TextInput
              onChangeText={setYearInput}
              value={yearInput}
              style={styles.input}
              placeholder="e.g. 300 Level"
              placeholderTextColor="#8e95a5"
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setBioInput}
              value={bioInput}
              style={[styles.input, { minHeight: 60 }]}
              placeholder="Tell other students about you"
              placeholderTextColor="#8e95a5"
            />

            <Pressable
              accessibilityRole="button"
              onPress={handleSaveProfile}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
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
  editIconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#1b2234',
    height: 100,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderColor: '#0b0d11',
    borderRadius: 36,
    borderWidth: 3,
    bottom: -36,
    height: 72,
    justifyContent: 'center',
    position: 'absolute',
    width: 72,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  infoWrap: {
    marginTop: 44,
    paddingHorizontal: 16,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  displayName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  handle: {
    color: '#8e95a5',
    fontSize: 12,
    marginTop: 2,
  },
  schoolRow: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  bioText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  statsBar: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 24,
    width: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  followBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  followBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  followBtnTextActive: {
    color: '#ffffff',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  tabBtn: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    borderBottomColor: '#ffffff',
  },
  tabBtnText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  postsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  postCard: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  postCardTime: {
    color: '#64748b',
    fontSize: 10,
    marginBottom: 6,
  },
  postCardBody: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  postCardMeta: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  postCardStat: {
    color: '#8e95a5',
    fontSize: 11,
  },
  badgesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  badgeItem: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  badgeIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  badgeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  badgeName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeDesc: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#151822',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    marginTop: 20,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
