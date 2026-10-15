import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { IconSymbol } from '../components/IconSymbol';
import { TopBar } from '../components/TopBar';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type DatingScreenProps = {
  onMenuPress: () => void;
};

const suggestedMatches = [
  {
    name: 'Aisha',
    age: 20,
    school: 'Unilag',
    distance: '0.8 km away',
    bio: 'Study buddy, club nights, and a very strong opinion about good campus coffee.',
    tags: ['Books', 'Movies', 'Campus life'],
  },
  {
    name: 'Tobi',
    age: 22,
    school: 'Bells University',
    distance: '1.4 km away',
    bio: 'Weekend hikes, film nights, and pretending the deadline is still “tomorrow.”',
    tags: ['Travel', 'Art', 'Food'],
  },
];

export function DatingScreen({ onMenuPress }: DatingScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TopBar title="Dating" onMenuPress={onMenuPress} />
      <Text style={styles.subtitle}>
        Opt-in preview. Matches are mock data only and exact location/contact details are not exposed.
      </Text>

      <View style={styles.notice}>
        <View style={styles.noticeIconWrap}>
          <IconSymbol name="Shield" framed={false} size={9} />
        </View>
        <Text style={styles.noticeText}>
          Safety first: photos, exact location, and chat are intentionally limited in this preview.
        </Text>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterPill}>Nearby</Text>
        <Text style={styles.filterPill}>Campus</Text>
        <Text style={styles.filterPill}>Interests</Text>
      </View>

      <View style={styles.cardList}>
        {suggestedMatches.map((match) => (
          <View key={match.name} style={styles.profileCard}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar} />
            </View>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.name}>{match.name}, {match.age}</Text>
                <Text style={styles.meta}>{match.school} · {match.distance}</Text>
              </View>
              <Pressable accessibilityRole="button" style={styles.likeButton}>
                <IconSymbol name="Dating" framed={false} size={8} />
              </Pressable>
            </View>
            <Text style={styles.bio}>{match.bio}</Text>
            <View style={styles.tags}>
              {match.tags.map((tag) => (
                <Text key={tag} style={styles.tag}>{tag}</Text>
              ))}
            </View>
            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" style={styles.secondaryAction}>
                <Text style={styles.secondaryText}>Pass</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.primaryAction}>
                <Text style={styles.primaryText}>Like</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
  },
  noticeIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  noticeText: {
    color: colors.text,
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cardList: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  avatarRing: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: 12,
    width: 68,
  },
  avatar: {
    backgroundColor: colors.textMuted,
    borderRadius: 24,
    height: 42,
    width: 42,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  likeButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  bio: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.textMuted,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryAction: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  primaryAction: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryText: {
    color: colors.inverse,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
});
