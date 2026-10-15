import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <Image
        accessibilityLabel="Common Room logo"
        contentFit="contain"
        source={mode === 'dark'
          ? require('../../COMMON ROOM full logo white.png')
          : require('../../COMMON ROOM full logo.png')}
        style={styles.logo}
      />
      <View style={styles.actions}>
        <IconSymbol name="Search" framed={false} size={11} />
        {showBell ? <IconSymbol name="Bell" framed={false} size={11} /> : null}
        {showMenuButton ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress}>
            <IconSymbol name="Menu" framed={false} size={11} />
          </Pressable>
        ) : null}
        {showAvatar ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress}>
            <View style={styles.avatar} />
          </Pressable>
        ) : null}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  logo: {
    height: 28,
    width: 96,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 7,
    width: '100%',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  avatar: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.text,
    borderRadius: 18,
    borderWidth: 1,
    height: 26,
    width: 26,
  },
});
