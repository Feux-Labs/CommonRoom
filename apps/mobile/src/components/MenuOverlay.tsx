import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { UserProfile } from '../types/domain';

type MenuOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onAccountPress: () => void;
  onOpenStatus: () => void;
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
  onOpenSaved?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  onOpenMarketplace?: () => void;
  onLogout?: () => void;
  onToggleSchoolVisibility: () => void;
  profile?: UserProfile | null;
  recognitionTitle: string;
};

const menuSections = [
  ['Messages', 'Notifications', 'Status & Leaderboard', 'Marketplace', 'Saved'],
  ['Settings', 'Help & Support', 'Admin Panel'],
  ['Switch Account', 'Log Out'],
];

export function MenuOverlay({
  visible,
  onClose,
  onAccountPress,
  onOpenStatus,
  onOpenMessages,
  onOpenNotifications,
  onOpenSaved,
  onOpenSettings,
  onOpenHelp,
  onOpenAdmin,
  onOpenProfile,
  onOpenMarketplace,
  onLogout,
  onToggleSchoolVisibility,
  profile,
  recognitionTitle,
}: MenuOverlayProps) {
  const handleMenuItemPress = (item: string) => {
    switch (item) {
      case 'Status & Leaderboard':
        onOpenStatus();
        onClose();
        break;
      case 'Messages':
        onOpenMessages?.();
        onClose();
        break;
      case 'Notifications':
        onOpenNotifications?.();
        onClose();
        break;
      case 'Saved':
        onOpenSaved?.();
        onClose();
        break;
      case 'Marketplace':
        onOpenMarketplace?.();
        onClose();
        break;
      case 'Settings':
      case 'Privacy & Safety':
        onOpenSettings?.();
        onClose();
        break;
      case 'Help & Support':
        onOpenHelp?.();
        onClose();
        break;
      case 'Admin Panel':
        onOpenAdmin?.();
        onClose();
        break;
      case 'Log Out':
        onLogout?.();
        onClose();
        break;
      default:
        onClose();
    }
  };
  const { colors, mode, toggleTheme } = useAppTheme();
  const styles = createStyles(colors);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.backdrop}>
      <Pressable accessibilityLabel="Close menu backdrop" style={styles.dim} onPress={onClose} />
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onOpenProfile?.();
            onClose();
          }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 16 }}>
              {profile?.displayName?.charAt(0) || 'G'}
            </Text>
          </View>
          <View style={styles.profile}>
            <Text style={styles.name}>{profile?.displayName || 'Gideon Ibitoye'}</Text>
            <Text style={styles.username}>@{profile?.displayName ? profile.displayName.toLowerCase().replace(/\s+/g, '_') : 'gideon_ibitoye'}</Text>
            <Text style={styles.recognitionTitle}>{recognitionTitle}</Text>
            {profile?.school ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: profile.showSchoolOnProfile }}
                onPress={onToggleSchoolVisibility}
                style={styles.schoolPrivacy}
              >
                <Text style={styles.school}>{profile.showSchoolOnProfile ? profile.school : 'School hidden on profile'}</Text>
                <Text style={styles.schoolPrivacyAction}>{profile.showSchoolOnProfile ? 'Hide' : 'Show'}</Text>
              </Pressable>
            ) : <Text style={styles.school}>School optional · general community access</Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose}>
            <Text style={styles.close}>X</Text>
          </Pressable>
        </Pressable>
        <View style={styles.stats}>
          <Text style={styles.stat}>24 Posts</Text>
          <Text style={styles.stat}>1.2K Followers</Text>
          <Text style={styles.stat}>892 Following</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onAccountPress} style={styles.accountAction}>
          <Text style={styles.accountTitle}>Sign in / Create account</Text>
          <Text style={styles.accountNote}>Preview only · no account data is saved</Text>
        </Pressable>
        {menuSections.map((section, index) => (
          <View key={index} style={styles.section}>
            {section.filter((item) => item !== 'Switch Account').map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => handleMenuItemPress(item)}
                style={styles.row}
              >
                <Text style={styles.rowText}>{item}</Text>
                <Text style={styles.chevron}>{'>'}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.premium}>
          <Text style={styles.premiumTitle}>Commonroom Premium</Text>
          <Text style={styles.premiumCopy}>Get more from your campus experience</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: {
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  dim: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 0.32,
  },
  sheet: {
    backgroundColor: colors.background,
    flex: 0.68,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.text,
    borderRadius: 30,
    borderWidth: 1,
    height: 56,
    width: 56,
  },
  profile: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  username: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  school: {
    color: colors.text,
    fontSize: 11,
    marginTop: 4,
  },
  schoolPrivacy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 3,
  },
  schoolPrivacyAction: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  recognitionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  close: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  stats: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingBottom: 14,
  },
  stat: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    width: '30%',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 4,
  },
  accountAction: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  accountNote: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  appearanceLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  themeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeAction: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 18,
  },
  premium: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: 12,
    padding: 12,
  },
  premiumTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  premiumCopy: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
