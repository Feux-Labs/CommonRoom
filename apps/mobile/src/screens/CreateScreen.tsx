import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconSymbol } from '../components/IconSymbol';
import { TopBar } from '../components/TopBar';
import { createActions, recentDrafts } from '../data/mockData';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import { CreateComposerModal, CreateComposerMode } from './create/CreateComposerModal';

type CreateScreenProps = {
  onMenuPress: () => void;
};

const quickActions = [
  { title: 'Add Hashtag', icon: 'Text', detail: '#CampusLife' },
  { title: 'Mention', icon: 'Group', detail: 'Tag a person or group' },
  { title: 'Add Location', icon: 'MapPin', detail: 'Add a campus location' },
  { title: 'Audience', icon: 'Shield', detail: 'School community' },
];

export function CreateScreen({ onMenuPress }: CreateScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [dialog, setDialog] = useState<{ title: string; body: string } | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<CreateComposerMode | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const showUpcoming = (title: string) => {
    setDialog({
      title,
      body: 'This is a visual prototype. The complete composer and publishing flow is planned for a later sprint.',
    });
  };

  const createClipComposer = () => {
    openComposer('clip');
  };

  const openComposer = (mode: CreateComposerMode) => {
    setComposerMode(mode);
    setPublishNotice(null);
  };

  const mapCreateActionToMode = (title: string): CreateComposerMode => {
    switch (title) {
      case 'Text Post':
        return 'text';
      case 'Poll':
        return 'poll';
      case 'Question':
        return 'question';
      case 'Group Post':
        return 'group';
      case 'Record Video':
        return 'video';
      case 'Upload Photos':
        return 'photo';
      case 'Create Clip':
        return 'clip';
      default:
        return 'text';
    }
  };

  const handlePublish = () => {
    setComposerMode(null);
    setPublishNotice('Prototype post published locally. No backend submission was sent.');
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TopBar title="Create" onMenuPress={onMenuPress} />
        <Text style={styles.subtitle}>
          Share your thoughts, moments and ideas with your campus community.
        </Text>

        <View style={styles.grid}>
          {createActions.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.title}
              onPress={() => {
                if (action.title === 'Create Clip') {
                  createClipComposer();
                  return;
                }

                const mode = mapCreateActionToMode(action.title);
                openComposer(mode);
              }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <IconSymbol name={action.icon} framed={false} size={25} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionBody}>{action.body}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {quickActions.map((action) => {
            const selected = selectedQuickAction === action.title;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={action.title}
                onPress={() => setSelectedQuickAction(selected ? null : action.title)}
                style={styles.quickAction}
              >
                <View style={[styles.quickIcon, selected && styles.quickIconSelected]}>
                  <IconSymbol name={action.icon} framed={false} size={19} />
                </View>
                <Text style={styles.quickLabel}>{action.title}</Text>
              </Pressable>
            );
          })}
        </View>
        {selectedQuickAction ? (
          <Text accessibilityLiveRegion="polite" style={styles.quickFeedback}>
            {quickActions.find((action) => action.title === selectedQuickAction)?.detail}
          </Text>
        ) : null}
        {publishNotice ? (
          <Text accessibilityLiveRegion="polite" style={styles.publishNotice}>
            {publishNotice}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setDialog({
              title: 'Need inspiration?',
              body: 'Try a campus question, share an event tip, or tell your school community about a moment worth remembering.',
            })
          }
          style={({ pressed }) => [styles.inspiration, pressed && styles.pressed]}
        >
          <View style={styles.inspirationCopy}>
            <Text style={styles.inspirationTitle}>Need inspiration?</Text>
            <Text style={styles.inspirationText}>
              Check out trending topics, events and popular posts from your school.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.divider} />
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Drafts</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => showUpcoming('All drafts')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAll}>View All</Text>
            <Text style={styles.chevronSmall}>›</Text>
          </Pressable>
        </View>
        {recentDrafts.map((draft) => (
          <View key={draft.title} style={styles.draftRowWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => showUpcoming('Draft preview')}
              style={({ pressed }) => [styles.draftRow, pressed && styles.pressed]}
            >
              <Image
                accessibilityLabel="Campus scene in a saved draft"
                contentFit="cover"
                source={{ uri: draft.image }}
                style={styles.draftImage}
              />
              <View style={styles.draftCopy}>
                <Text numberOfLines={1} style={styles.draftTitle}>{draft.title}</Text>
                <Text style={styles.draftMeta}>{draft.type}  ·  {draft.updated}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More draft options"
              hitSlop={10}
              onPress={() => showUpcoming('Draft options')}
              style={styles.moreButton}
            >
              <Text style={styles.more}>•••</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <CreateComposerModal
        colors={colors}
        mode={composerMode}
        onClose={() => setComposerMode(null)}
        onPublish={(draft) => {
          handlePublish();
          const mediaLabel = draft.mediaType ? ` ${draft.mediaType}` : '';
          setDialog({
            title: `${draft.mode[0].toUpperCase()}${draft.mode.slice(1)}${mediaLabel} draft ready`,
            body: `Prototype content prepared for: "${draft.title}"\nAudience: ${draft.audience}. ${draft.hashtags?.length ? `Tags: ${draft.hashtags.join(' ')}` : ''}`.trim(),
          });
        }}
        visible={composerMode !== null}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setDialog(null)}
        transparent
        visible={dialog !== null}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialog?.title}</Text>
            <Text style={styles.dialogBody}>{dialog?.body}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDialog(null)}
              style={styles.dialogButton}
            >
              <Text style={styles.dialogButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 132,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 22,
    paddingTop: 7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 14,
    minHeight: 96,
    minWidth: 142,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.78,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  actionBody: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 22,
    marginTop: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  quickIconSelected: {
    backgroundColor: '#3a3d40',
    borderColor: colors.text,
    borderWidth: 1,
  },
  quickLabel: {
    color: colors.text,
    fontSize: 10,
    textAlign: 'center',
  },
  quickFeedback: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 22,
    paddingTop: 8,
    textAlign: 'center',
  },
  publishNotice: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    marginHorizontal: 22,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inspiration: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 13,
    marginHorizontal: 22,
    marginTop: 20,
    padding: 15,
  },
  inspirationCopy: {
    flex: 1,
  },
  inspirationTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  inspirationText: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  chevron: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '300',
  },
  recentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 15,
  },
  viewAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  viewAll: {
    color: colors.textMuted,
    fontSize: 11,
  },
  chevronSmall: {
    color: colors.textMuted,
    fontSize: 18,
  },
  draftRowWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 22,
    paddingTop: 12,
  },
  draftRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  draftImage: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    height: 58,
    width: 58,
  },
  draftCopy: {
    flex: 1,
  },
  draftTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  draftMeta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  moreButton: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  more: {
    color: colors.text,
    fontSize: 14,
    letterSpacing: 2,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 400,
    padding: 22,
    width: '100%',
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  dialogBody: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  dialogButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    marginTop: 18,
    paddingHorizontal: 19,
    paddingVertical: 10,
  },
  dialogButtonText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
});
