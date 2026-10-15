import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors } from '../theme/tokens';
import { IconSymbol } from './IconSymbol';

type TopBarProps = {
  title?: string;
  showBell?: boolean;
  showAvatar?: boolean;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
};

export function TopBar({ title, showBell = true, showAvatar = true, showMenuButton = false, onMenuPress }: TopBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.top);

  return (
    <View style={styles.wrap}>
      {/* Centered Brand Title in pure white, safe below iPhone notch / island */}
      <View style={styles.centerWrap} pointerEvents="none">
        <Text style={styles.brandTitle}>{title || 'Commonroom'}</Text>
      </View>

      <View style={styles.leftPlaceholder} />

      <View style={styles.actions}>
        <IconSymbol name="Search" framed={false} size={15} />
        {showBell ? <IconSymbol name="Bell" framed={false} size={15} /> : null}
        {showMenuButton ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress}>
            <IconSymbol name="Menu" framed={false} size={15} />
          </Pressable>
        ) : null}
        {showAvatar ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress}>
            <View style={styles.avatar} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors, topInset: number) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: topInset > 0 ? topInset : 12,
    paddingBottom: 8,
    position: 'relative',
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  centerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: topInset > 0 ? topInset : 12,
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  leftPlaceholder: {
    width: 32,
    height: 32,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
    zIndex: 2,
  },
  avatar: {
    backgroundColor: colors.surfaceSoft,
    borderColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    height: 28,
    width: 28,
  },
});

