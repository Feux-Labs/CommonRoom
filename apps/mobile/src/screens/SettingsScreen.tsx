import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Bell, ChevronRight, Eye, Moon, Shield, Trash2, User } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { UserProfile } from '../types/domain';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  profile?: UserProfile | null;
};

export function SettingsScreen({ onBack, onLogout, profile }: SettingsScreenProps) {
  const { colors, mode, toggleTheme } = useAppTheme();
  const styles = createStyles(colors);

  const [pushNotifs, setPushNotifs] = useState(true);
  const [showSchool, setShowSchool] = useState(profile?.showSchoolOnProfile ?? true);
  const [allowStrangers, setAllowStrangers] = useState(false);
  const [anonMode, setAnonMode] = useState(false);

  const handleClearCache = () => {
    Alert.alert('Cache Cleared', 'Temporary media and cached campus feeds have been cleared.');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Summary Card */}
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.displayName?.charAt(0) ?? 'G'}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{profile?.displayName || 'Gideon Ibitoye'}</Text>
            <Text style={styles.accountHandle}>@gideon_ibitoye · {profile?.school || 'University of Lagos'}</Text>
          </View>
        </View>

        {/* Section 1: Appearance */}
        <Text style={styles.sectionHeader}>Appearance</Text>
        <View style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Moon size={18} color="#ffffff" />
              <View>
                <Text style={styles.rowTitle}>Dark Mode</Text>
                <Text style={styles.rowDesc}>OLED-friendly dark theme</Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#2a3342', true: '#ffffff' }}
              thumbColor={mode === 'dark' ? '#000000' : '#8e95a5'}
            />
          </View>
        </View>

        {/* Section 2: Notifications */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Bell size={18} color="#ffffff" />
              <View>
                <Text style={styles.rowTitle}>Push Notifications</Text>
                <Text style={styles.rowDesc}>Likes, comments, and Meet connections</Text>
              </View>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: '#2a3342', true: '#ffffff' }}
              thumbColor={pushNotifs ? '#000000' : '#8e95a5'}
            />
          </View>
        </View>

        {/* Section 3: Privacy & Safety */}
        <Text style={styles.sectionHeader}>Privacy & Safety</Text>
        <View style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Eye size={18} color="#ffffff" />
              <View>
                <Text style={styles.rowTitle}>Show School on Profile</Text>
                <Text style={styles.rowDesc}>Display your university or campus name</Text>
              </View>
            </View>
            <Switch
              value={showSchool}
              onValueChange={setShowSchool}
              trackColor={{ false: '#2a3342', true: '#ffffff' }}
              thumbColor={showSchool ? '#000000' : '#8e95a5'}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Shield size={18} color="#ffffff" />
              <View>
                <Text style={styles.rowTitle}>Meet Messaging Permission</Text>
                <Text style={styles.rowDesc}>Only allow mutual connections to message you</Text>
              </View>
            </View>
            <Switch
              value={!allowStrangers}
              onValueChange={(val) => setAllowStrangers(!val)}
              trackColor={{ false: '#2a3342', true: '#ffffff' }}
              thumbColor={!allowStrangers ? '#000000' : '#8e95a5'}
            />
          </View>
        </View>

        {/* Section 4: Data & Actions */}
        <Text style={styles.sectionHeader}>Storage & Account</Text>
        <View style={styles.groupCard}>
          <Pressable accessibilityRole="button" onPress={handleClearCache} style={styles.actionRow}>
            <Text style={styles.actionRowText}>Clear Cached Media</Text>
            <ChevronRight size={16} color="#8e95a5" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.actionRow}>
            <Text style={[styles.actionRowText, { color: '#ef4444' }]}>Log Out of Commonroom</Text>
            <ChevronRight size={16} color="#ef4444" />
          </Pressable>
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
  accountCard: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  accountHandle: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  rowDesc: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    height: 1,
    marginLeft: 44,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRowText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
