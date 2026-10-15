import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

type SectionHeaderProps = {
  title: string;
  action?: string;
};

export function SectionHeader({ title, action = 'View All' }: SectionHeaderProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.action}>{action}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  action: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});
