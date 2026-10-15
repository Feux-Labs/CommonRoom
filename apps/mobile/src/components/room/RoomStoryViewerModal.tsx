import { Image } from 'expo-image';
import { Heart, Send, X } from 'lucide-react-native/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import type { RoomStory } from '../../types/room';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION_MS = 5000;

type RoomStoryViewerModalProps = {
  visible: boolean;
  stories: RoomStory[];
  initialStoryIndex: number;
  onClose: () => void;
  onStorySeen: (authorId: string) => void;
  onOpenProfile?: (authorId: string) => void;
};

export function RoomStoryViewerModal({
  visible,
  stories,
  initialStoryIndex,
  onClose,
  onStorySeen,
  onOpenProfile,
}: RoomStoryViewerModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  const activeStory = stories[storyIndex];
  const activeItem = activeStory?.items[itemIndex];

  // Sync initial index
  useEffect(() => {
    if (visible) {
      setStoryIndex(initialStoryIndex);
      setItemIndex(0);
      setProgress(0);
      setIsLiked(false);
    }
  }, [visible, initialStoryIndex]);

  // Mark active story as seen
  useEffect(() => {
    if (visible && activeStory) {
      onStorySeen(activeStory.authorId);
    }
  }, [visible, storyIndex, activeStory, onStorySeen]);

  // Story progress timer
  useEffect(() => {
    if (!visible || !activeStory) return;

    setProgress(0);
    const intervalTime = 50;
    const step = intervalTime / STORY_DURATION_MS;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          clearInterval(timer);
          handleNextItem();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [visible, storyIndex, itemIndex, activeStory]);

  const handleNextItem = () => {
    if (!activeStory) return;
    if (itemIndex < activeStory.items.length - 1) {
      setItemIndex((prev) => prev + 1);
      setProgress(0);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setItemIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevItem = () => {
    if (itemIndex > 0) {
      setItemIndex((prev) => prev - 1);
      setProgress(0);
    } else if (storyIndex > 0) {
      const prevStory = stories[storyIndex - 1];
      setStoryIndex((prev) => prev - 1);
      setItemIndex(prevStory.items.length - 1);
      setProgress(0);
    }
  };

  if (!visible || !activeStory || !activeItem) {
    return null;
  }

  const itemsCount = activeStory.items.length;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
      visible={visible}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Story Media */}
        <Image
          contentFit="cover"
          source={{ uri: activeItem.mediaUrl }}
          style={styles.storyMedia}
        />

        {/* Gradient dark overlay for readability */}
        <View style={styles.topBackdrop} />

        {/* Tap zones for left / right navigation */}
        <View style={styles.touchZones}>
          <Pressable
            accessibilityLabel="Previous story item"
            accessibilityRole="button"
            onPress={handlePrevItem}
            style={styles.touchLeft}
          />
          <Pressable
            accessibilityLabel="Next story item"
            accessibilityRole="button"
            onPress={handleNextItem}
            style={styles.touchRight}
          />
        </View>

        {/* Safe Header */}
        <SafeAreaView style={styles.headerSafe}>
          {/* Progress Segment Bars */}
          <View style={styles.progressContainer}>
            {activeStory.items.map((_, index) => {
              let barFill = 0;
              if (index < itemIndex) barFill = 1;
              else if (index === itemIndex) barFill = progress;

              return (
                <View key={index} style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(barFill * 100, 100)}%` }]} />
                </View>
              );
            })}
          </View>

          {/* Author Details Header */}
          <View style={styles.authorRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onOpenProfile?.(activeStory.authorId);
              }}
              style={styles.authorIdentity}
            >
              {activeStory.authorAvatar ? (
                <Image source={{ uri: activeStory.authorAvatar }} style={styles.authorAvatar} />
              ) : (
                <View style={[styles.authorAvatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderInitial}>
                    {activeStory.authorName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.authorNameText}>{activeStory.authorName}</Text>
                <Text style={styles.authorMetaText}>
                  {activeItem.time} · {activeItem.school || 'Campus'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel="Close story"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color="#FFFFFF" size={22} strokeWidth={2.4} />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Bottom Caption and Actions */}
        <SafeAreaView style={styles.footerSafe}>
          {activeItem.caption ? (
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>{activeItem.caption}</Text>
            </View>
          ) : null}

          <View style={styles.replyRow}>
            <TextInput
              onChangeText={setReplyText}
              placeholder="Send reply…"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              style={styles.replyInput}
              value={replyText}
            />
            {replyText.trim().length > 0 ? (
              <Pressable
                accessibilityLabel="Send reply"
                accessibilityRole="button"
                onPress={() => setReplyText('')}
                style={styles.sendButton}
              >
                <Send color="#FFFFFF" size={18} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Like story"
              accessibilityRole="button"
              onPress={() => setIsLiked(!isLiked)}
              style={styles.iconButton}
            >
              <Heart
                color={isLiked ? '#FFFFFF' : '#FFFFFF'}
                fill={isLiked ? '#FFFFFF' : 'transparent'}
                size={24}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    storyMedia: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    topBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 140,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    touchZones: {
      position: 'absolute',
      top: 100,
      bottom: 100,
      left: 0,
      right: 0,
      flexDirection: 'row',
    },
    touchLeft: {
      flex: 1,
    },
    touchRight: {
      flex: 2,
    },
    headerSafe: {
      position: 'absolute',
      top: 12,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    progressContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 4,
      paddingTop: 8,
    },
    progressBarTrack: {
      flex: 1,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.35)',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#FFFFFF',
    },
    authorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    authorIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    authorAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    placeholderAvatar: {
      backgroundColor: '#2A2A2A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderInitial: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    authorNameText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    authorMetaText: {
      color: 'rgba(255, 255, 255, 0.75)',
      fontSize: 11,
      marginTop: 1,
    },
    closeButton: {
      padding: 6,
    },
    footerSafe: {
      position: 'absolute',
      bottom: 16,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      zIndex: 10,
    },
    captionContainer: {
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 12,
    },
    captionText: {
      color: '#FFFFFF',
      fontSize: 13,
      lineHeight: 18,
    },
    replyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    replyInput: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.35)',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      color: '#FFFFFF',
      paddingHorizontal: 16,
      fontSize: 14,
    },
    sendButton: {
      padding: 8,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
    },
    iconButton: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
