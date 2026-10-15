import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MainTab, TabItem } from '../types/navigation';
import { useAppTheme } from '../theme/ThemeContext';
import { IconSymbol } from './IconSymbol';

type BottomTabsProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

const tabs: TabItem[] = [
  { key: 'home', label: 'Room', icon: 'Home' },
  { key: 'meet', label: 'Meet', icon: 'Meet' },
  { key: 'create', label: '', icon: 'Create' },
  { key: 'anonymous', label: 'Anonymous', icon: 'Message' },
  { key: 'marketplace', label: 'Market', icon: 'ShoppingCart' },
];

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        const isCreate = tab.key === 'create';

        if (isCreate) {
          return (
            <View key={tab.key} style={styles.createHolder}>
              <Pressable
                accessibilityLabel="Create a new post"
                accessibilityRole="button"
                onPress={() => onChange('create')}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                ]}
              >
                <Text style={styles.createPlus}>+</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.item}
          >
            <IconSymbol name={tab.icon} active={active} framed={false} size={11} />
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
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    left: 0,
    paddingBottom: 12,
    paddingTop: 6,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 44,
  },
  createHolder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    height: 44,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    elevation: 6,
    height: 48,
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 48,
  },
  createButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  createPlus: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: -2,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  active: {
    color: colors.text,
    fontWeight: '800',
  },
  activeIndicator: {
    backgroundColor: colors.text,
    borderRadius: 3,
    height: 4,
    position: 'absolute',
    top: -2,
    width: 4,
  },
});
