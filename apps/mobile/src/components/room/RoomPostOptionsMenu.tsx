import {
  EyeOff,
  Flag,
  Pencil,
  Share2,
  Trash,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native/icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import type { RoomPost } from '../../types/room';

type RoomPostOptionsMenuProps = {
  visible: boolean;
  post: RoomPost | null;
  currentUserId?: string;
  isFollowingAuthor: boolean;
  onClose: () => void;
  onToggleFollow: (authorId: string) => void;
  onHidePost: (postId: string) => void;
  onReportPost: (postId: string, reason: string) => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (post: RoomPost) => void;
  onShareLink?: (postId: string) => void;
};

const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Harassment or bullying',
  'Spam or misleading information',
  'Violation of campus guidelines',
];

export function RoomPostOptionsMenu({
  visible,
  post,
  currentUserId,
  isFollowingAuthor,
  onClose,
  onToggleFollow,
  onHidePost,
  onReportPost,
  onDeletePost,
  onEditPost,
  onShareLink,
}: RoomPostOptionsMenuProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [reporting, setReporting] = useState(false);

  if (!visible || !post) return null;

  const isOwnPost = currentUserId && post.authorId === currentUserId;

  const handleClose = () => {
    setReporting(false);
    onClose();
  };

  const handleSelectReportReason = (reason: string) => {
    onReportPost(post.id, reason);
    handleClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.backdropPressable}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {reporting ? (
            /* Report Reasons View */
            <View style={styles.menuList}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Report post</Text>
                <Pressable onPress={() => setReporting(false)}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>
              <Text style={styles.reportSubtitle}>
                Why are you reporting this post from @{post.authorUsername}?
              </Text>
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => handleSelectReportReason(reason)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>{reason}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            /* Main Post Options */
            <View style={styles.menuList}>
              {!isOwnPost ? (
                <Pressable
                  onPress={() => {
                    onToggleFollow(post.authorId);
                    handleClose();
                  }}
                  style={styles.menuItem}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck color={colors.text} size={20} />
                      <Text style={styles.menuItemText}>Unfollow @{post.authorUsername}</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus color={colors.text} size={20} />
                      <Text style={styles.menuItemText}>Follow @{post.authorUsername}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  onShareLink?.(post.id);
                  handleClose();
                }}
                style={styles.menuItem}
              >
                <Share2 color={colors.text} size={20} />
                <Text style={styles.menuItemText}>Share via link</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onHidePost(post.id);
                  handleClose();
                }}
                style={styles.menuItem}
              >
                <EyeOff color={colors.text} size={20} />
                <Text style={styles.menuItemText}>Not interested in this post</Text>
              </Pressable>

              {!isOwnPost ? (
                <Pressable
                  onPress={() => setReporting(true)}
                  style={styles.menuItem}
                >
                  <Flag color={colors.textMuted} size={20} />
                  <Text style={styles.menuItemText}>Report post</Text>
                </Pressable>
              ) : null}

              {isOwnPost ? (
                <>
                  <Pressable
                    onPress={() => {
                      onEditPost?.(post);
                      handleClose();
                    }}
                    style={styles.menuItem}
                  >
                    <Pencil color={colors.text} size={20} />
                    <Text style={styles.menuItemText}>Edit post</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      onDeletePost?.(post.id);
                      handleClose();
                    }}
                    style={[styles.menuItem, styles.destructiveItem]}
                  >
                    <Trash color="#FF4D4F" size={20} />
                    <Text style={styles.destructiveText}>Delete post</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 34,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    menuList: {
      gap: 16,
    },
    menuHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    menuTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    reportSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      marginBottom: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 10,
    },
    menuItemText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '500',
    },
    destructiveItem: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
    },
    destructiveText: {
      color: '#FF4D4F',
      fontSize: 15,
      fontWeight: '600',
    },
  });
