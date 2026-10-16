import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Bookmark, Heart, MapPin, ShoppingBag, Trash } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type SavedScreenProps = {
  onBack: () => void;
};

type SavedItem = {
  id: string;
  category: 'posts' | 'marketplace' | 'meet';
  title: string;
  subtitle: string;
  meta: string;
  price?: string;
};

const initialSaved: SavedItem[] = [
  {
    id: 's1',
    category: 'posts',
    title: 'Tips for passing CSC 301 midterms',
    subtitle: 'Comprehensive study guide and past questions repository shared by seniors.',
    meta: 'Posted by Aisha Bello · 2 days ago',
  },
  {
    id: 's2',
    category: 'marketplace',
    title: 'Apple MacBook Air M1 (8GB / 256GB)',
    subtitle: 'Space Gray, 92% battery health, original charger included.',
    meta: 'Listed by Tobi Adebayo · UNILAG New Hall',
    price: '₦480,000',
  },
  {
    id: 's3',
    category: 'meet',
    title: 'Chioma Okeke, 21',
    subtitle: 'Economics 300 Level · Covenant Univ · Tech & Chill vibe',
    meta: 'Saved connection profile',
  },
];

export function SavedScreen({ onBack }: SavedScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [savedItems, setSavedItems] = useState<SavedItem[]>(initialSaved);
  const [filter, setFilter] = useState<'all' | 'posts' | 'marketplace' | 'meet'>('all');

  const handleRemove = (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = savedItems.filter((item) => filter === 'all' || item.category === filter);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Saved Items</Text>
      </View>

      <View style={styles.filterBar}>
        {(['all', 'posts', 'marketplace', 'meet'] as const).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            onPress={() => setFilter(tab)}
            style={[styles.filterPill, filter === tab && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, filter === tab && styles.filterPillTextActive]}>
              {tab === 'all' ? 'All' : tab === 'posts' ? 'Posts' : tab === 'marketplace' ? 'Market' : 'Meet'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.category === 'posts' ? 'Post' : item.category === 'marketplace' ? 'Marketplace' : 'Meet Profile'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Remove from saved"
                  accessibilityRole="button"
                  onPress={() => handleRemove(item.id)}
                  style={styles.trashBtn}
                >
                  <Trash size={14} color="#8e95a5" />
                </Pressable>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              {item.price ? <Text style={styles.cardPrice}>{item.price}</Text> : null}
              <Text style={styles.cardMeta}>{item.meta}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Bookmark size={40} color="#8e95a5" />
            <Text style={styles.emptyTitle}>No saved items in this category</Text>
            <Text style={styles.emptySubtitle}>Bookmark posts, marketplace deals, or meet profiles to see them here.</Text>
          </View>
        )}
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
  },
  filterPillText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trashBtn: {
    padding: 4,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  cardPrice: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  cardMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
  },
});
