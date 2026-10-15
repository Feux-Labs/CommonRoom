import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  SlidersHorizontal,
} from 'lucide-react-native/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ImageStyle,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { TopBar } from '../components/TopBar';
import { RoomAuthorProfileModal } from '../components/room/RoomAuthorProfileModal';
import { RoomCommentsSheet } from '../components/room/RoomCommentsSheet';
import { RoomPostOptionsMenu } from '../components/room/RoomPostOptionsMenu';
import { RoomStoriesBar } from '../components/room/RoomStoriesBar';
import { RoomStoryViewerModal } from '../components/room/RoomStoryViewerModal';
import { roomService } from '../services/roomService';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import type { FeedPost } from '../types/domain';
import type { RoomComment, RoomPost, RoomProfile, RoomScope, RoomStory } from '../types/room';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type HomeScreenProps = {
  onMenuPress: () => void;
  newPosts?: FeedPost[];
  interests?: string[];
  currentUserProfile?: { displayName?: string; username?: string | null; avatarUrl?: string | null };
};

type RoomFeedSection = 'For You' | 'General' | 'Trending / Conversations';

const roomFeedSections: RoomFeedSection[] = ['For You', 'General', 'Trending / Conversations'];

function formatCount(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

export function HomeScreen({
  onMenuPress,
  newPosts = [],
  interests = [],
  currentUserProfile,
}: HomeScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeIndex, setActiveIndex] = useState(0);
  const [feedSection, setFeedSection] = useState<RoomFeedSection>('For You');
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [stories, setStories] = useState<RoomStory[]>([]);

  // Modals & Sheets State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [optionsPost, setOptionsPost] = useState<RoomPost | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<RoomProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? posts[activeIndex];

  const scope: RoomScope =
    feedSection === 'Trending / Conversations'
      ? 'trending'
      : feedSection === 'General'
      ? 'general'
      : 'for_you';

  // Load feed and stories
  const refreshFeed = useCallback(() => {
    const loadedPosts = roomService.getPosts(scope, interests);
    setPosts(loadedPosts);
    setStories(roomService.getStories());
  }, [scope, interests]);

  useEffect(() => {
    refreshFeed();
    setActiveIndex(0);
  }, [refreshFeed]);

  // Insert local/new posts into roomService when submitted
  useEffect(() => {
    if (newPosts.length > 0) {
      newPosts.forEach((post) => {
        const roomPost: RoomPost = {
          ...post,
          authorId: 'current-user',
          authorUsername: currentUserProfile?.username || 'you',
          authorName: currentUserProfile?.displayName || 'You',
          authorAvatar: currentUserProfile?.avatarUrl || null,
          liked: false,
          saved: false,
          createdAt: new Date().toISOString(),
        };
        roomService.addLocalPost(roomPost);
      });
      refreshFeed();
    }
  }, [newPosts, currentUserProfile, refreshFeed]);

  // Toast banner helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Vertical swipe gesture handler
  const getPanResponder = (index: number) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 18,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          setActiveIndex((current) => Math.min(current + 1, posts.length - 1));
        }
        if (gestureState.dy > 30) {
          setActiveIndex((current) => Math.max(current - 1, 0));
        }
      },
    });

  // Action Handlers
  const handleToggleLike = (postId: string) => {
    const updated = roomService.toggleLike(postId);
    if (updated) {
      setPosts((current) => current.map((p) => (p.id === postId ? updated : p)));
    }
  };

  const handleToggleSave = (postId: string) => {
    const updated = roomService.toggleSave(postId);
    if (updated) {
      setPosts((current) => current.map((p) => (p.id === postId ? updated : p)));
      showToast(updated.saved ? 'Saved to your bookmarks' : 'Removed from bookmarks');
    }
  };

  const handleShare = async (post: RoomPost) => {
    try {
      await Share.share({
        title: `Post by ${post.authorName} on Commonroom`,
        message: `${post.authorName}: "${post.caption}" - shared from Commonroom`,
      });
    } catch {
      showToast('Post link shared');
    }
  };

  const handleOpenComments = (postId: string) => {
    setCommentsPostId(postId);
  };

  const handleAddComment = (postId: string, text: string, parentId: string | null) => {
    roomService.addComment(postId, text, parentId, currentUserProfile);
    setPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
    );
    showToast(parentId ? 'Reply posted' : 'Comment posted');
  };

  const handleOpenProfile = (authorId: string) => {
    const profile = roomService.getProfile(authorId);
    if (profile) {
      setSelectedProfile(profile);
    }
  };

  const handleToggleFollow = (authorId: string) => {
    const isNowFollowing = roomService.toggleFollow(authorId);
    // Update local profile if open
    setSelectedProfile((current) =>
      current && current.id === authorId
        ? {
            ...current,
            following: isNowFollowing,
            follower_count: isNowFollowing
              ? current.follower_count + 1
              : Math.max(0, current.follower_count - 1),
          }
        : current
    );
    showToast(isNowFollowing ? 'Following student' : 'Unfollowed student');
  };

  const handleHidePost = (postId: string) => {
    roomService.hidePost(postId);
    setPosts((current) => current.filter((p) => p.id !== postId));
    setActiveIndex((current) => Math.max(0, current - 1));
    showToast('We will show you fewer posts like this');
  };

  const handleReportPost = (postId: string, reason: string) => {
    showToast('Thank you for reporting. Our campus safety team has been notified.');
  };

  const handleDeletePost = (postId: string) => {
    roomService.deletePost(postId);
    setPosts((current) => current.filter((p) => p.id !== postId));
    setActiveIndex((current) => Math.max(0, current - 1));
    showToast('Your post was deleted');
  };

  const currentComments = commentsPostId ? roomService.getComments(commentsPostId) : [];

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <TopBar onMenuPress={onMenuPress} />

      {/* Stories Carousel */}
      <RoomStoriesBar
        currentUserAvatar={currentUserProfile?.avatarUrl}
        onAddStory={() => showToast('Tap Create (+) below to share your story')}
        onSelectStory={(index) => setActiveStoryIndex(index)}
        stories={stories}
      />

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          contentContainerStyle={styles.tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {roomFeedSections.map((section) => {
            const active = feedSection === section;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={section}
                onPress={() => {
                  setFeedSection(section);
                  setActiveIndex(0);
                }}
                style={[styles.feedTab, active && styles.feedTabActive]}
              >
                <Text style={[styles.feedTabText, active && styles.feedTabTextActive]}>
                  {section}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Toast Notice */}
      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Feed Cards */}
      <View style={styles.feedWrapper}>
        {posts.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedTitle}>No moments found</Text>
            <Text style={styles.emptyFeedCopy}>
              Try switching tabs or share a moment with your campus.
            </Text>
          </View>
        ) : null}

        {posts.map((post, index) => {
          const isActive = index === activeIndex;
          const pan = getPanResponder(index);

          return (
            <View
              key={post.id}
              {...(isActive ? pan.panHandlers : {})}
              style={[styles.feedCard, !isActive && styles.inactiveCard]}
            >
              {/* Header Row */}
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleOpenProfile(post.authorId)}
                  style={styles.authorBadge}
                >
                  {post.authorAvatar ? (
                    <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <Text style={styles.placeholderInitial}>
                        {post.authorName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.identity}>
                    <Text style={styles.username}>@{post.authorUsername}</Text>
                  </View>
                </Pressable>

                <View style={styles.headerRight}>
                  <Text style={styles.time}>{post.time}</Text>
                  <Pressable
                    accessibilityLabel="More options"
                    accessibilityRole="button"
                    onPress={() => setOptionsPost(post)}
                    style={styles.moreButton}
                  >
                    <SlidersHorizontal color={colors.textMuted} size={17} />
                  </Pressable>
                </View>
              </View>

              {/* Media Container */}
              <View style={styles.mediaWrap}>
                <Pressable
                  accessibilityLabel="Open media"
                  accessibilityRole="button"
                  onPress={() => setSelectedPostId(post.id)}
                  style={styles.mediaPressable}
                >
                  <FeedPostMedia autoPlay={isActive} post={post} style={styles.image} />
                  {post.location ? (
                    <View style={styles.topOverlay}>
                      <View style={styles.location}>
                        <MapPin color={colors.text} size={11} />
                        <Text style={styles.locationText}>{post.location}</Text>
                      </View>
                    </View>
                  ) : null}
                </Pressable>

                {/* Vertical Action Rail */}
                <View style={styles.rail}>
                  {/* Like Button */}
                  <Pressable
                    accessibilityLabel="Like post"
                    accessibilityRole="button"
                    onPress={() => handleToggleLike(post.id)}
                    style={styles.railItem}
                  >
                    <Heart
                      color={post.liked ? '#FF4D4F' : colors.text}
                      fill={post.liked ? '#FF4D4F' : 'transparent'}
                      size={22}
                    />
                    <Text style={[styles.railCount, post.liked && styles.railCountLiked]}>
                      {formatCount(post.likes)}
                    </Text>
                  </Pressable>

                  {/* Comments Button */}
                  <Pressable
                    accessibilityLabel="Open comments"
                    accessibilityRole="button"
                    onPress={() => handleOpenComments(post.id)}
                    style={styles.railItem}
                  >
                    <MessageCircle color={colors.text} size={22} />
                    <Text style={styles.railCount}>{formatCount(post.comments)}</Text>
                  </Pressable>

                  {/* Bookmark / Save Button */}
                  <Pressable
                    accessibilityLabel="Save post"
                    accessibilityRole="button"
                    onPress={() => handleToggleSave(post.id)}
                    style={styles.railItem}
                  >
                    <Bookmark
                      color={colors.text}
                      fill={post.saved ? colors.text : 'transparent'}
                      size={22}
                    />
                    <Text style={styles.railCount}>{formatCount(post.saves)}</Text>
                  </Pressable>

                  {/* Share Button */}
                  <Pressable
                    accessibilityLabel="Share post"
                    accessibilityRole="button"
                    onPress={() => handleShare(post)}
                    style={styles.railItem}
                  >
                    <Send color={colors.text} size={21} />
                    <Text style={styles.railCount}>{formatCount(post.shares)}</Text>
                  </Pressable>
                </View>

                <View style={styles.swipeHint}>
                  <Text style={styles.swipeText}>Swipe up for more</Text>
                </View>
              </View>

              {/* Caption & Tags */}
              <View style={styles.caption}>
                <Pressable onPress={() => handleOpenProfile(post.authorId)}>
                  <Text style={styles.captionTitle}>{post.authorName}</Text>
                </Pressable>
                <Text style={styles.copy}>{post.caption}</Text>
                {post.tags?.length ? (
                  <Text style={styles.tags}>{post.tags.join('   ')}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Stories Viewer Modal */}
      {activeStoryIndex !== null ? (
        <RoomStoryViewerModal
          initialStoryIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onOpenProfile={(authorId) => {
            setActiveStoryIndex(null);
            handleOpenProfile(authorId);
          }}
          onStorySeen={(authorId) => {
            roomService.markStorySeen(authorId);
            setStories(roomService.getStories());
          }}
          stories={stories}
          visible={activeStoryIndex !== null}
        />
      ) : null}

      {/* Comments Bottom Sheet */}
      <RoomCommentsSheet
        comments={currentComments}
        onClose={() => setCommentsPostId(null)}
        onOpenProfile={(authorId) => {
          setCommentsPostId(null);
          handleOpenProfile(authorId);
        }}
        onSubmitComment={handleAddComment}
        postId={commentsPostId || ''}
        visible={commentsPostId !== null}
      />

      {/* Classmate Profile Modal */}
      <RoomAuthorProfileModal
        onClose={() => setSelectedProfile(null)}
        onSelectPost={(postId) => {
          const targetIndex = posts.findIndex((p) => p.id === postId);
          if (targetIndex >= 0) setActiveIndex(targetIndex);
        }}
        onToggleFollow={handleToggleFollow}
        profile={selectedProfile}
        visible={selectedProfile !== null}
      />

      {/* Post Options Menu */}
      <RoomPostOptionsMenu
        currentUserId="current-user"
        isFollowingAuthor={
          optionsPost ? roomService.getProfile(optionsPost.authorId)?.following ?? false : false
        }
        onClose={() => setOptionsPost(null)}
        onDeletePost={handleDeletePost}
        onHidePost={handleHidePost}
        onReportPost={handleReportPost}
        onShareLink={() => {
          if (optionsPost) handleShare(optionsPost);
        }}
        onToggleFollow={(authorId) => {
          handleToggleFollow(authorId);
        }}
        post={optionsPost}
        visible={optionsPost !== null}
      />

      {/* Selected Post Preview Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedPostId(null)}
        transparent
        visible={selectedPostId !== null}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close post preview"
            accessibilityRole="button"
            onPress={() => setSelectedPostId(null)}
            style={styles.modalDismissArea}
          />
          <View style={styles.modalContent}>
            {selectedPost ? (
              <>
                <View style={styles.modalHeader}>
                  <Pressable
                    onPress={() => {
                      setSelectedPostId(null);
                      handleOpenProfile(selectedPost.authorId);
                    }}
                    style={styles.authorBadge}
                  >
                    {selectedPost.authorAvatar ? (
                      <Image source={{ uri: selectedPost.authorAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Text style={styles.placeholderInitial}>
                          {selectedPost.authorName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.identity}>
                      <Text style={styles.username}>@{selectedPost.authorUsername}</Text>
                    </View>
                  </Pressable>
                  <Text style={styles.time}>{selectedPost.time}</Text>
                </View>
                <FeedPostMedia autoPlay post={selectedPost} style={styles.modalImage} />
                <Text style={styles.modalCaption}>{selectedPost.caption}</Text>
                {selectedPost.tags?.length ? (
                  <Text style={styles.tags}>{selectedPost.tags.join('   ')}</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Text style={styles.modalStat}>♥ {formatCount(selectedPost.likes)}</Text>
                  <Text style={styles.modalStat}>💬 {formatCount(selectedPost.comments)}</Text>
                  <Text style={styles.modalStat}>⤴ {formatCount(selectedPost.shares)}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FeedPostMedia({
  post,
  style,
  autoPlay,
}: {
  post: RoomPost;
  style: ImageStyle & ViewStyle;
  autoPlay: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [activeMedia, setActiveMedia] = useState(0);
  const items = post.mediaItems?.length
    ? post.mediaItems
    : [{ uri: post.mediaUrl, mediaType: post.mediaType === 'video' ? ('video' as const) : ('photo' as const) }];

  if (items.length === 1) {
    const item = items[0];
    return item.mediaType === 'video' ? (
      <FeedVideo autoPlay={autoPlay} style={style} uri={item.uri} />
    ) : (
      <Image contentFit="cover" source={{ uri: item.uri }} style={style} transition={220} />
    );
  }

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={style}>
      <ScrollView
        horizontal
        onMomentumScrollEnd={(event) => {
          if (width > 0) setActiveMedia(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View key={`${item.uri}-${index}`} style={{ height: '100%', width }}>
            {item.mediaType === 'video' ? (
              <FeedVideo
                autoPlay={autoPlay && index === activeMedia}
                style={fillMediaStyle}
                uri={item.uri}
              />
            ) : (
              <Image
                contentFit="cover"
                source={{ uri: item.uri }}
                style={fillImageStyle}
                transition={220}
              />
            )}
          </View>
        ))}
      </ScrollView>
      <View style={stylesForMedia.counter}>
        <Text style={stylesForMedia.counterText}>
          {activeMedia + 1}/{items.length}
        </Text>
      </View>
    </View>
  );
}

function FeedVideo({ uri, style, autoPlay }: { uri: string; style: ViewStyle; autoPlay: boolean }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = false;
  });

  useEffect(() => {
    if (autoPlay) player.play();
    else player.pause();
  }, [autoPlay, player]);

  return <VideoView player={player} style={style} />;
}

const fillMediaStyle: ViewStyle = { width: '100%', height: '100%' };
const fillImageStyle: ImageStyle = { width: '100%', height: '100%' };

const stylesForMedia = StyleSheet.create({
  counter: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    right: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabsContainer: {
      flexGrow: 0,
      flexShrink: 0,
      height: 46,
      justifyContent: 'center',
    },
    tabsScroll: {
      flexGrow: 0,
      flexShrink: 0,
      height: 46,
    },
    tabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      height: 46,
    },
    feedTab: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 7,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
      alignSelf: 'center',
    },
    feedTabActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    feedTabText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    feedTabTextActive: {
      color: colors.background,
      fontWeight: '700',
    },
    toast: {
      position: 'absolute',
      top: 60,
      left: 20,
      right: 20,
      zIndex: 99,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    toastText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    feedWrapper: {
      flex: 1,
      position: 'relative',
    },
    emptyFeed: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 8,
    },
    emptyFeedTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    emptyFeedCopy: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    feedCard: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      paddingBottom: 68,
    },
    inactiveCard: {
      display: 'none',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    authorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
    },
    placeholderAvatar: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderInitial: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    identity: {
      gap: 2,
    },
    username: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    time: {
      color: colors.textMuted,
      fontSize: 12,
    },
    moreButton: {
      padding: 4,
    },
    mediaWrap: {
      flex: 1,
      marginHorizontal: 14,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
    },
    mediaPressable: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    topOverlay: {
      position: 'absolute',
      top: 14,
      left: 14,
    },
    location: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    locationText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },
    rail: {
      position: 'absolute',
      right: 14,
      bottom: 24,
      alignItems: 'center',
      gap: 18,
    },
    railItem: {
      alignItems: 'center',
      gap: 4,
    },
    railCount: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    railCountLiked: {
      color: '#FF4D4F',
    },
    swipeHint: {
      position: 'absolute',
      bottom: 10,
      alignSelf: 'center',
    },
    swipeText: {
      color: 'rgba(255, 255, 255, 0.65)',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    caption: {
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 3,
    },
    captionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    copy: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    tags: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      flex: 1,
      justifyContent: 'center',
      padding: 16,
    },
    modalDismissArea: {
      ...(StyleSheet.absoluteFill as object),
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      gap: 12,
      overflow: 'hidden',
      padding: 16,
    },
    modalHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalImage: {
      borderRadius: radius.md,
      height: 280,
      width: '100%',
    },
    modalCaption: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 14,
    },
    modalStat: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
