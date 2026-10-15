import { Image } from 'expo-image';
import { MapPin, UserCheck, UserPlus, X } from 'lucide-react-native/icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import type { RoomProfile } from '../../types/room';

type RoomAuthorProfileModalProps = {
  visible: boolean;
  profile: RoomProfile | null;
  onClose: () => void;
  onToggleFollow: (authorId: string) => void;
  onSelectPost?: (postId: string) => void;
};

export function RoomAuthorProfileModal({
  visible,
  profile,
  onClose,
  onToggleFollow,
  onSelectPost,
}: RoomAuthorProfileModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (!visible || !profile) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Dismiss profile"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropPressable}
        />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandle} />
            <Pressable
              accessibilityLabel="Close profile"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.contentWrap}>
            {/* Profile Info */}
            <View style={styles.profileHeader}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderInitial}>
                    {profile.display_name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.nameBlock}>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <Text style={styles.username}>@{profile.username || 'student'}</Text>
              </View>

              {profile.school ? (
                <View style={styles.schoolBadge}>
                  <MapPin color={colors.textMuted} size={12} />
                  <Text style={styles.schoolText}>{profile.school}</Text>
                </View>
              ) : null}

              {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

              {/* Stats & Follow Button */}
              <View style={styles.actionRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{profile.follower_count}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{profile.posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => onToggleFollow(profile.id)}
                  style={[
                    styles.followButton,
                    profile.following && styles.followingButton,
                  ]}
                >
                  {profile.following ? (
                    <>
                      <UserCheck color={colors.text} size={15} />
                      <Text style={styles.followingButtonText}>Following</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus color={colors.background} size={15} />
                      <Text style={styles.followButtonText}>Follow</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Author's Posts Section */}
            <View style={styles.postsSection}>
              <Text style={styles.sectionTitle}>Shared Moments</Text>
              {profile.posts.length === 0 ? (
                <Text style={styles.noPostsText}>No moments shared yet.</Text>
              ) : (
                <View style={styles.postsGrid}>
                  {profile.posts.map((post) => (
                    <Pressable
                      key={post.id}
                      onPress={() => {
                        onClose();
                        onSelectPost?.(post.id);
                      }}
                      style={styles.postThumbnailWrap}
                    >
                      <Image source={{ uri: post.mediaUrl }} style={styles.postThumbnail} />
                      <View style={styles.thumbnailOverlay}>
                        <Text style={styles.thumbnailLikes}>♥ {post.likes}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '82%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetHeader: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 4,
      position: 'relative',
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    closeButton: {
      position: 'absolute',
      right: 16,
      top: 10,
      padding: 4,
    },
    contentWrap: {
      padding: 20,
      gap: 20,
    },
    profileHeader: {
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    placeholderAvatar: {
      backgroundColor: colors.surfaceSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderInitial: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
    },
    nameBlock: {
      alignItems: 'center',
      gap: 2,
    },
    displayName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    username: {
      color: colors.textMuted,
      fontSize: 13,
    },
    schoolBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    schoolText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    bioText: {
      color: colors.text,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 16,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statBox: {
      alignItems: 'center',
    },
    statNumber: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    followButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.text,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 18,
    },
    followButtonText: {
      color: colors.background,
      fontSize: 13,
      fontWeight: '700',
    },
    followingButton: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    followingButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    postsSection: {
      gap: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    noPostsText: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: 'italic',
    },
    postsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    postThumbnailWrap: {
      width: '31%',
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSoft,
      position: 'relative',
    },
    postThumbnail: {
      width: '100%',
      height: '100%',
    },
    thumbnailOverlay: {
      position: 'absolute',
      bottom: 4,
      left: 6,
    },
    thumbnailLikes: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
  });
