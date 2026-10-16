import { useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, CheckCheck, MessageSquarePlus, Search, Send, ShieldCheck, Sticker } from 'lucide-react-native/icons';
import { TopBar } from '../components/TopBar';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';

type MessagesScreenProps = {
  onBack: () => void;
  initialUserId?: string;
  initialUserName?: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
};

type Conversation = {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
  school: string;
};

const mockConversations: Conversation[] = [
  {
    id: 'c1',
    userId: 'u1',
    name: 'Aisha Bello',
    username: 'aisha_cs',
    avatarColor: '#6366f1',
    lastMessage: 'Let’s sync up for the hackathon brainstorm at the library!',
    time: '2m ago',
    unreadCount: 1,
    online: true,
    school: 'UNILAG',
  },
  {
    id: 'c2',
    userId: 'u2',
    name: 'Tobi Adebayo',
    username: 'tobi_arch',
    avatarColor: '#ec4899',
    lastMessage: 'Did you see the new architectural rendering draft?',
    time: '45m ago',
    unreadCount: 0,
    online: true,
    school: 'Bells Tech',
  },
  {
    id: 'c3',
    userId: 'u3',
    name: 'Chioma Okeke',
    username: 'chioma_eco',
    avatarColor: '#10b981',
    lastMessage: 'Thanks for sharing the economics lecture notes!',
    time: '3h ago',
    unreadCount: 0,
    online: false,
    school: 'Covenant Univ',
  },
  {
    id: 'c4',
    userId: 'u4',
    name: 'Gideon Moderator',
    username: 'campus_mod',
    avatarColor: '#f59e0b',
    lastMessage: 'Welcome to Commonroom! Let us know if you have questions.',
    time: '1d ago',
    unreadCount: 0,
    online: false,
    school: 'Campus Team',
  },
];

export function MessagesScreen({ onBack, initialUserId, initialUserName }: MessagesScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (initialUserId && initialUserName) {
      const exists = mockConversations.find((c) => c.userId === initialUserId);
      if (!exists) {
        const newConv: Conversation = {
          id: `c-new-${initialUserId}`,
          userId: initialUserId,
          name: initialUserName,
          username: initialUserName.toLowerCase().replace(/\s+/g, '_'),
          avatarColor: '#6366f1',
          lastMessage: 'Started a new connection.',
          time: 'just now',
          unreadCount: 0,
          online: true,
          school: 'Campus Connection',
        };
        return [newConv, ...mockConversations];
      }
    }
    return mockConversations;
  });

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(() => {
    if (initialUserId) {
      return conversations.find((c) => c.userId === initialUserId) ?? null;
    }
    return null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    c1: [
      { id: 'm1', senderId: 'u1', text: 'Hey! Saw you are into tech and coding too.', timestamp: '10:14 AM', isMe: false },
      { id: 'm2', senderId: 'me', text: 'Hey Aisha! Yes, building on web and mobile right now.', timestamp: '10:15 AM', isMe: true },
      { id: 'm3', senderId: 'u1', text: 'Let’s sync up for the hackathon brainstorm at the library!', timestamp: '10:16 AM', isMe: false },
    ],
    c2: [
      { id: 'm4', senderId: 'u2', text: 'Hey there! Loved your post on campus life.', timestamp: 'Yesterday', isMe: false },
      { id: 'm5', senderId: 'me', text: 'Appreciate it Tobi!', timestamp: 'Yesterday', isMe: true },
    ],
  });

  const [inputText, setInputText] = useState('');

  const currentMessages = activeConversation ? (messages[activeConversation.id] ?? []) : [];

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConversation) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text: inputText.trim(),
      timestamp: 'just now',
      isMe: true,
    };

    setMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] ?? []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: inputText.trim(), time: 'just now' }
          : c
      )
    );

    setInputText('');
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      {activeConversation ? (
        /* Active Chat View */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatContainer}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <Pressable
              accessibilityLabel="Back to conversations"
              accessibilityRole="button"
              onPress={() => setActiveConversation(null)}
              style={styles.backBtn}
            >
              <ArrowLeft size={18} color={colors.text} />
            </Pressable>
            <View style={[styles.chatAvatar, { backgroundColor: activeConversation.avatarColor }]}>
              <Text style={styles.chatAvatarText}>{activeConversation.name.charAt(0)}</Text>
              {activeConversation.online ? <View style={styles.onlineBadgeSmall} /> : null}
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{activeConversation.name}</Text>
              <Text style={styles.chatHeaderStatus}>
                {activeConversation.online ? 'Active now' : `@${activeConversation.username} · ${activeConversation.school}`}
              </Text>
            </View>
          </View>

          {/* Messages Scroll */}
          <ScrollView
            contentContainerStyle={styles.messagesScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.safetyCard}>
              <ShieldCheck size={14} color="#8e95a5" />
              <Text style={styles.safetyCardText}>
                Encrypted student messaging. Keep personal phone numbers private.
              </Text>
            </View>

            {currentMessages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.messageRow, msg.isMe ? styles.messageRowMe : styles.messageRowThem]}
              >
                <View
                  style={[styles.messageBubble, msg.isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}
                >
                  <Text style={[styles.messageText, msg.isMe ? styles.messageTextMe : styles.messageTextThem]}>
                    {msg.text}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.timestampText}>{msg.timestamp}</Text>
                    {msg.isMe ? <CheckCheck size={12} color="#ffffff" style={{ opacity: 0.7 }} /> : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={setInputText}
              placeholder="Type a message…"
              placeholderTextColor="#8e95a5"
              style={styles.textInput}
              value={inputText}
            />
            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={!inputText.trim()}
              onPress={handleSendMessage}
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            >
              <Send size={15} color={inputText.trim() ? '#000000' : '#8e95a5'} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Conversations List */
        <View style={styles.listContainer}>
          <View style={styles.topHeader}>
            <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
              <ArrowLeft size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.screenTitle}>Direct Messages</Text>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={15} color="#8e95a5" />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Search conversations…"
              placeholderTextColor="#8e95a5"
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>

          {/* List of Conversations */}
          <ScrollView contentContainerStyle={styles.conversationsScroll} showsVerticalScrollIndicator={false}>
            {filteredConversations.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => {
                  setActiveConversation(c);
                  setConversations((prev) =>
                    prev.map((item) => (item.id === c.id ? { ...item, unreadCount: 0 } : item))
                  );
                }}
                style={styles.conversationItem}
              >
                <View style={[styles.avatar, { backgroundColor: c.avatarColor }]}>
                  <Text style={styles.avatarText}>{c.name.charAt(0)}</Text>
                  {c.online ? <View style={styles.onlineBadgeSmall} /> : null}
                </View>
                <View style={styles.convDetails}>
                  <View style={styles.convHeaderRow}>
                    <Text style={styles.convName}>{c.name}</Text>
                    <Text style={styles.convTime}>{c.time}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.convLastMessage}>
                    {c.lastMessage}
                  </Text>
                </View>
                {c.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{c.unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  topHeader: {
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
  screenTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  conversationsScroll: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  conversationItem: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  onlineBadgeSmall: {
    backgroundColor: '#10b981',
    borderColor: '#0b0d11',
    borderRadius: 6,
    borderWidth: 1.5,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  convDetails: {
    flex: 1,
    marginLeft: 12,
  },
  convHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  convName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  convTime: {
    color: '#8e95a5',
    fontSize: 11,
  },
  convLastMessage: {
    color: '#8e95a5',
    fontSize: 12,
    marginTop: 3,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chatAvatar: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginLeft: 8,
    position: 'relative',
    width: 36,
  },
  chatAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeaderName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  chatHeaderStatus: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 1,
  },
  messagesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  safetyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 10,
  },
  safetyCardText: {
    color: '#8e95a5',
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  messageBubbleMe: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: '#1b1f2b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTextThem: {
    color: '#ffffff',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestampText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
  },
  inputBar: {
    alignItems: 'center',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    maxHeight: 90,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
