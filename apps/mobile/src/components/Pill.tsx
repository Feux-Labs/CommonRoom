import { StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

type PillProps = {
  label: string;
  active?: boolean;
};

export function Pill({ label, active = false }: PillProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return <Text style={[styles.pill, active && styles.active]}>{label}</Text>;
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  pill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  active: {
    backgroundColor: colors.text,
    color: colors.inverse,
  },
});
