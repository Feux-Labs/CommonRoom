import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppColors, radius } from '../../theme/tokens';

export type CreateComposerMode = 'text' | 'question' | 'poll' | 'group' | 'clip' | 'video' | 'photo';

export type ComposerDraft = {
  mode: CreateComposerMode;
  title: string;
  body: string;
  audience: string;
  optionA?: string;
  optionB?: string;
  hashtags?: string[];
  mentions?: string[];
  mediaType?: 'clip' | 'video' | 'photo';
};

type Props = {
  visible: boolean;
  mode: CreateComposerMode | null;
  colors: AppColors;
  onClose: () => void;
  onPublish: (draft: ComposerDraft) => void;
};

const copy: Record<CreateComposerMode, { title: string; subtitle: string; placeholder: string; audience: string; defaultTitle: string }> = {
  text: {
    title: 'Text post',
    subtitle: 'Share a thought with your campus community.',
    placeholder: 'What is happening on campus today?',
    audience: 'School community',
    defaultTitle: 'Campus update',
  },
  question: {
    title: 'Question',
    subtitle: 'Start a conversation and get honest opinions.',
    placeholder: 'Ask your campus community anything…',
    audience: 'Everyone at school',
    defaultTitle: 'Quick campus question',
  },
  poll: {
    title: 'Poll',
    subtitle: 'Collect a quick vote from your community.',
    placeholder: 'Ask a simple yes/no or preference question…',
    audience: 'Friends and classmates',
    defaultTitle: 'Quick poll',
  },
  group: {
    title: 'Group post',
    subtitle: 'Share with a relevant group or interest circle.',
    placeholder: 'Share something useful for your group…',
    audience: 'Campus group',
    defaultTitle: 'Group update',
  },
  clip: {
    title: 'Clip post',
    subtitle: 'Share a quick campus moment in a short-form clip.',
    placeholder: 'Add a caption for your clip…',
    audience: 'School community',
    defaultTitle: 'Campus clip',
  },
  video: {
    title: 'Video post',
    subtitle: 'Share a longer vertical video or story with your school.',
    placeholder: 'Tell people what they are watching…',
    audience: 'School community',
    defaultTitle: 'Campus video',
  },
  photo: {
    title: 'Photo post',
    subtitle: 'Upload a photo and add text, hashtags, and mentions.',
    placeholder: 'Write your caption and tag the moment…',
    audience: 'School community',
    defaultTitle: 'Campus photo',
  },
};

export function CreateComposerModal({ visible, mode, colors, onClose, onPublish }: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('School community');
  const [optionA, setOptionA] = useState('Yes');
  const [optionB, setOptionB] = useState('No');
  const [hashtags, setHashtags] = useState('');
  const [mentions, setMentions] = useState('');

  useEffect(() => {
    if (!mode) {
      setTitle('');
      setBody('');
      setAudience(copy.text.audience);
      setOptionA('Yes');
      setOptionB('No');
      setHashtags('');
      setMentions('');
      return;
    }

    const config = copy[mode];
    setTitle(config.defaultTitle);
    setBody('');
    setAudience(config.audience);
    setOptionA(mode === 'poll' ? 'Yes' : '');
    setOptionB(mode === 'poll' ? 'No' : '');
    setHashtags(mode === 'photo' ? '#campus #friends' : '');
    setMentions(mode === 'photo' ? '@mide @joyce' : '');
  }, [mode, visible]);

  if (!visible || !mode) {
    return null;
  }

  const config = copy[mode];

  const handlePublish = () => {
    const parsedHashtags = hashtags
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    const parsedMentions = mentions
      .split(/[\s,]+/)
      .map((mention) => mention.trim())
      .filter(Boolean)
      .map((mention) => (mention.startsWith('@') ? mention : `@${mention}`));

    onPublish({
      mode,
      title: title.trim() || config.defaultTitle,
      body: body.trim() || config.placeholder,
      audience,
      ...(mode === 'poll' ? { optionA: optionA.trim() || 'Yes', optionB: optionB.trim() || 'No' } : {}),
      ...(mode === 'photo' ? { hashtags: parsedHashtags, mentions: parsedMentions, mediaType: 'photo' } : {}),
      ...(mode === 'clip' ? { mediaType: 'clip' } : {}),
      ...(mode === 'video' ? { mediaType: 'video' } : {}),
    });
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Create</Text>
              <Text style={styles.title}>{config.title}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close composer" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{config.subtitle}</Text>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={config.defaultTitle}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Audience</Text>
              <TextInput
                value={audience}
                onChangeText={setAudience}
                placeholder={config.audience}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>{mode === 'poll' ? 'Question' : 'Caption'}</Text>
              <TextInput
                multiline
                value={body}
                onChangeText={setBody}
                placeholder={config.placeholder}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.textarea]}
              />
            </View>

            {mode === 'poll' ? (
              <View style={styles.pollWrap}>
                <Text style={styles.label}>Options</Text>
                <TextInput
                  value={optionA}
                  onChangeText={setOptionA}
                  placeholder="Option A"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={optionB}
                  onChangeText={setOptionB}
                  placeholder="Option B"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.pollInput]}
                />
              </View>
            ) : null}

            {mode === 'photo' ? (
              <>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Hashtags</Text>
                  <TextInput
                    value={hashtags}
                    onChangeText={setHashtags}
                    placeholder="#campus #friendship"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Mentions</Text>
                  <TextInput
                    value={mentions}
                    onChangeText={setMentions}
                    placeholder="@friend @club"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handlePublish} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Publish prototype</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxHeight: '82%',
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  closeText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 20,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  pollWrap: {
    marginTop: 4,
  },
  pollInput: {
    marginTop: 10,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    flex: 1.2,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
});
