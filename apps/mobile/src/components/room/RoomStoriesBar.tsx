import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native/icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import type { RoomStory } from '../../types/room';

type RoomStoriesBarProps = {
  stories: RoomStory[];
  onSelectStory: (index: number) => void;
  onAddStory?: () => void;
  currentUserAvatar?: string | null;
};

export function RoomStoriesBar({
  stories,
  onSelectStory,
  onAddStory,
  currentUserAvatar,
}: RoomStoriesBarProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* Your story bubble */}
        <Pressable
          accessibilityLabel="Add to your story"
          accessibilityRole="button"
          onPress={onAddStory}
          style={styles.storyItem}
        >
          <View style={styles.myAvatarWrap}>
            {currentUserAvatar ? (
              <Image source={{ uri: currentUserAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                <Text style={styles.placeholderInitial}>Y</Text>
              </View>
            )}
            <View style={styles.plusBadge}>
              <Plus color={colors.background} size={12} strokeWidth={3} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.authorName}>Your Story</Text>
        </Pressable>

        {/* Stories from classmates */}
        {stories.map((story, index) => {
          return (
            <Pressable
              accessibilityLabel={`${story.authorName}'s story`}
              accessibilityRole="button"
              key={story.authorId}
              onPress={() => onSelectStory(index)}
              style={styles.storyItem}
            >
              <View
                style={[
                  styles.avatarRing,
                  story.seen ? styles.avatarRingSeen : styles.avatarRingUnseen,
                ]}
              >
                {story.authorAvatar ? (
                  <Image source={{ uri: story.authorAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderInitial}>
                      {story.authorName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.authorName}>
                {story.authorUsername ? `@${story.authorUsername}` : story.authorName.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: {
      height: 84,
      flexGrow: 0,
      flexShrink: 0,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    scrollContent: {
      paddingHorizontal: 16,
      gap: 14,
      alignItems: 'center',
    },
    storyItem: {
      alignItems: 'center',
      width: 64,
      gap: 5,
    },
    avatarRing: {
      width: 58,
      height: 58,
      borderRadius: 29,
      padding: 2.5,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    avatarRingUnseen: {
      borderColor: colors.text, // Monochrome prominent ring
    },
    avatarRingSeen: {
      borderColor: colors.border, // Muted ring for seen stories
    },
    myAvatarWrap: {
      width: 58,
      height: 58,
      borderRadius: 29,
      padding: 2,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      backgroundColor: colors.surface,
    },
    placeholderAvatar: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    placeholderInitial: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    plusBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    authorName: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
