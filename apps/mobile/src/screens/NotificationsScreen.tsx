import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Bell, Check, Heart, MessageCircle, ShoppingBag, Trophy, UserPlus } from 'lucide-react-native/icons';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type NotificationsScreenProps = {
  onBack: () => void;
};

type NotificationItem = {
  id: string;
  type: 'like' | 'comment' | 'mention' | 'follow' | 'connection' | 'status' | 'market';
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
  avatarInitial: string;
  avatarColor: string;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'connection',
    title: 'New Connection!',
    subtitle: 'Aisha Bello is also interested. Say hello in Messages!',
    time: '5m ago',
    read: false,
    avatarInitial: 'A',
    avatarColor: '#6366f1',
  },
  {
    id: 'n2',
    type: 'status',
    title: 'Campus Aura Upgraded!',
    subtitle: 'You reached Common Leader rank (+150 Aura points).',
    time: '2h ago',
    read: false,
    avatarInitial: '★',
    avatarColor: '#f59e0b',
  },
  {
    id: 'n3',
    type: 'like',
    title: 'Joyce A. liked your post',
    subtitle: '“Another day, another campus breeze…”',
    time: '4h ago',
    read: true,
    avatarInitial: 'J',
    avatarColor: '#ec4899',
  },
  {
    id: 'n4',
    type: 'comment',
    title: 'David O. replied to your post',
    subtitle: '“Totally agree with this! The library AC is always freezing.”',
    time: '6h ago',
    read: true,
    avatarInitial: 'D',
    avatarColor: '#10b981',
  },
  {
    id: 'n5',
    type: 'follow',
    title: 'New Follower',
    subtitle: 'Tobi Adebayo started following your campus posts.',
    time: '1d ago',
    read: true,
    avatarInitial: 'T',
    avatarColor: '#3b82f6',
  },
  {
    id: 'n6',
    type: 'market',
    title: 'Marketplace Inquiry',
    subtitle: 'Someone is interested in your “Engineering Textbook” listing.',
    time: '2d ago',
    read: true,
    avatarInitial: 'M',
    avatarColor: '#8b5cf6',
  },
];

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'mentions' | 'connections'>('all');

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'connections') return n.type === 'connection';
    if (filter === 'mentions') return n.type === 'comment' || n.type === 'mention';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'connection':
        return <UserPlus size={13} color="#ffffff" />;
      case 'status':
        return <Trophy size={13} color="#ffffff" />;
      case 'like':
        return <Heart size={13} color="#ffffff" fill="#ffffff" />;
      case 'comment':
      case 'mention':
        return <MessageCircle size={13} color="#ffffff" />;
      case 'follow':
        return <UserPlus size={13} color="#ffffff" />;
      case 'market':
        return <ShoppingBag size={13} color="#ffffff" />;
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable accessibilityRole="button" onPress={markAllAsRead} style={styles.markReadBtn}>
          <Check size={14} color="#8e95a5" />
          <Text style={styles.markReadText}>Read all</Text>
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['all', 'connections', 'mentions'] as const).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            onPress={() => setFilter(tab)}
            style={[styles.filterPill, filter === tab && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, filter === tab && styles.filterPillTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Notifications List */}
      <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => toggleRead(item.id)}
            style={[styles.notifItem, !item.read && styles.notifItemUnread]}
          >
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.avatarText}>{item.avatarInitial}</Text>
              <View style={styles.typeBadge}>{getIcon(item.type)}</View>
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              <Text style={styles.itemTime}>{item.time}</Text>
            </View>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        ))}
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
    justifyContent: 'space-between',
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
    flex: 1,
    marginLeft: 8,
  },
  markReadBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markReadText: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
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
  listScroll: {
    paddingBottom: 40,
  },
  notifItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notifItemUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  typeBadge: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderColor: '#1e232f',
    borderRadius: 9,
    borderWidth: 1.5,
    bottom: -2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 18,
  },
  itemBody: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  itemTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  unreadDot: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    height: 8,
    marginLeft: 8,
    width: 8,
  },
});
