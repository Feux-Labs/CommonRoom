import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MainTab, TabItem } from '../types/navigation';
import { useAppTheme } from '../theme/ThemeContext';
import { IconSymbol } from './IconSymbol';

type BottomTabsProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: 'Home' },
  { key: 'create', label: 'Create', icon: 'Create' },
  { key: 'marketplace', label: 'Market', icon: 'ShoppingCart' },
  { key: 'games', label: 'Games', icon: 'Games' },
  { key: 'anonymous', label: 'Anonymous', icon: 'Message' },
];

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.item}
          >
            <IconSymbol name={tab.icon} active={active} framed={false} size={10} />
            <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
            {active ? <View accessibilityElementsHidden style={styles.activeIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingBottom: 10,
    paddingTop: 5,
    position: 'absolute',
    right: 0,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 42,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  active: {
    color: colors.text,
    fontWeight: '800',
  },
  activeIndicator: {
    backgroundColor: colors.text,
    borderRadius: 3,
    height: 5,
    position: 'absolute',
    top: -1,
    width: 5,
  },
});
