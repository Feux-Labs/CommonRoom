import { Image } from 'expo-image';
import { Send, X } from 'lucide-react-native/icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import type { RoomComment } from '../../types/room';

type RoomCommentsSheetProps = {
  visible: boolean;
  postId: string;
  comments: RoomComment[];
  onClose: () => void;
  onSubmitComment: (postId: string, text: string, parentId: string | null) => void;
  onOpenProfile?: (authorId: string) => void;
};

export function RoomCommentsSheet({
  visible,
  postId,
  comments,
  onClose,
  onSubmitComment,
  onOpenProfile,
}: RoomCommentsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<RoomComment | null>(null);

  if (!visible) return null;

  const rootComments = comments.filter((c) => !c.parent_id);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  const handleSend = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onSubmitComment(postId, trimmed, replyTarget ? replyTarget.id : null);
    setCommentText('');
    setReplyTarget(null);
  };

  const handleStartReply = (comment: RoomComment) => {
    setReplyTarget(comment);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        {/* Tapping outside dismisses */}
        <Pressable
          accessibilityLabel="Dismiss comments"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropPressable}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          {/* Sheet Handle & Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.headerTitleRow}>
              <Text style={styles.sheetTitle}>
                Comments <Text style={styles.commentCount}>({comments.length})</Text>
              </Text>
              <Pressable
                accessibilityLabel="Close comments"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
              >
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
          </View>

          {/* Comments List */}
          <ScrollView contentContainerStyle={styles.commentsList} style={styles.scrollArea}>
            {rootComments.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Start the conversation with your campus!</Text>
              </View>
            ) : null}

            {rootComments.map((comment) => {
              const childReplies = repliesFor(comment.id);
              return (
                <View key={comment.id} style={styles.commentThread}>
                  {/* Root Comment */}
                  <View style={styles.commentRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpenProfile?.(comment.author_id)}
                      style={styles.avatarWrap}
                    >
                      {comment.author_avatar ? (
                        <Image source={{ uri: comment.author_avatar }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                          <Text style={styles.placeholderInitial}>
                            {comment.author_name.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    <View style={styles.commentBodyWrap}>
                      <View style={styles.authorLine}>
                        <Text style={styles.authorName}>{comment.author_name}</Text>
                        <Text style={styles.authorHandle}>@{comment.author_username}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.body}</Text>
                      <View style={styles.commentMeta}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => handleStartReply(comment)}
                        >
                          <Text style={styles.replyButtonText}>Reply</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Nested Replies */}
                  {childReplies.map((reply) => (
                    <View key={reply.id} style={styles.replyRow}>
                      <View style={styles.replyIndentLine} />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onOpenProfile?.(reply.author_id)}
                        style={styles.smallAvatarWrap}
                      >
                        {reply.author_avatar ? (
                          <Image source={{ uri: reply.author_avatar }} style={styles.smallAvatar} />
                        ) : (
                          <View style={[styles.smallAvatar, styles.placeholderAvatar]}>
                            <Text style={styles.smallPlaceholderInitial}>
                              {reply.author_name.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                      <View style={styles.commentBodyWrap}>
                        <View style={styles.authorLine}>
                          <Text style={styles.authorName}>{reply.author_name}</Text>
                          <Text style={styles.authorHandle}>@{reply.author_username}</Text>
                        </View>
                        <Text style={styles.commentText}>{reply.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>

          {/* Replying Banner */}
          {replyTarget ? (
            <View style={styles.replyingBanner}>
              <Text style={styles.replyingText}>
                Replying to <Text style={styles.replyingTargetName}>{replyTarget.author_name}</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReplyTarget(null)}
                style={styles.cancelReplyButton}
              >
                <Text style={styles.cancelReplyText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Comment Input Bar */}
          <SafeAreaView style={styles.inputBarSafe}>
            <View style={styles.inputRow}>
              <TextInput
                maxLength={1000}
                multiline
                onChangeText={setCommentText}
                placeholder={
                  replyTarget
                    ? `Reply to @${replyTarget.author_username}…`
                    : 'Add a comment…'
                }
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={commentText}
              />
              <Pressable
                accessibilityLabel="Submit comment"
                accessibilityRole="button"
                disabled={commentText.trim().length === 0}
                onPress={handleSend}
                style={[
                  styles.sendButton,
                  commentText.trim().length === 0 && styles.sendButtonDisabled,
                ]}
              >
                <Send
                  color={commentText.trim().length > 0 ? colors.background : colors.textMuted}
                  size={16}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
      maxHeight: '80%',
      minHeight: '48%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetHeader: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    headerTitleRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    commentCount: {
      color: colors.textMuted,
      fontWeight: '500',
    },
    closeButton: {
      padding: 4,
    },
    scrollArea: {
      flex: 1,
    },
    commentsList: {
      padding: 16,
      gap: 18,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 36,
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: 13,
    },
    commentThread: {
      gap: 10,
    },
    commentRow: {
      flexDirection: 'row',
      gap: 12,
    },
    avatarWrap: {
      marginTop: 2,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    placeholderAvatar: {
      backgroundColor: colors.surfaceSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderInitial: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    commentBodyWrap: {
      flex: 1,
      gap: 3,
    },
    authorLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    authorName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    authorHandle: {
      color: colors.textMuted,
      fontSize: 12,
    },
    commentText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 3,
    },
    replyButtonText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    replyRow: {
      flexDirection: 'row',
      marginLeft: 26,
      gap: 10,
      alignItems: 'flex-start',
    },
    replyIndentLine: {
      width: 2,
      height: '100%',
      backgroundColor: colors.border,
      marginRight: 4,
    },
    smallAvatarWrap: {
      marginTop: 2,
    },
    smallAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    smallPlaceholderInitial: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    replyingBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surfaceSoft,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    replyingText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    replyingTargetName: {
      color: colors.text,
      fontWeight: '700',
    },
    cancelReplyButton: {
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    cancelReplyText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    inputBarSafe: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    input: {
      flex: 1,
      maxHeight: 90,
      minHeight: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
    },
  });
