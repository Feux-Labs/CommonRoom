import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ImagePlus, ShieldCheck, Video, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, uploadPostMedia } from '../../services/api';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/tokens';
import { FeedPost, FeedPostType } from '../../types/domain';

type CreateFlowScreenProps = {
  onClose: () => void;
  onPost: (post: FeedPost) => void;
};

type Audience = NonNullable<FeedPost['audience']>;

type SelectedMedia = {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
};

const postTypes: FeedPostType[] = ['photo', 'video', 'text', 'question', 'poll'];
const audiences: Audience[] = ['Public', 'Followers', 'Private'];
const maxMediaItems = 10;

function formatPostType(type: FeedPostType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function CreateFlowScreen({ onClose, onPost }: CreateFlowScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [postType, setPostType] = useState<FeedPostType>('photo');
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState<Audience>('Public');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chooseMedia = async () => {
    const remaining = postType === 'video' ? 1 : maxMediaItems - media.length;
    if (remaining < 1) {
      setErrorMessage(`A post can contain up to ${maxMediaItems} photos.`);
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: postType === 'video' ? ['videos'] : ['images'],
        allowsMultipleSelection: postType === 'photo',
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.canceled) return;

      const selected = result.assets.map((asset, index) => ({
        id: `${asset.assetId ?? asset.uri}-${Date.now()}-${index}`,
        uri: asset.uri,
        mediaType: postType === 'video' ? 'video' as const : 'photo' as const,
      }));
      setMedia((current) => [...current, ...selected].slice(0, maxMediaItems));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open your media library.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setErrorMessage(null);
    if (!caption.trim() && media.length === 0) {
      setErrorMessage('Add a caption or media before publishing.');
      return;
    }
    if (caption.length > 3000) {
      setErrorMessage('Captions can be up to 3,000 characters.');
      return;
    }
    if (postType === 'video' && (media.length !== 1 || media[0]?.mediaType !== 'video')) {
      setErrorMessage('A video post must contain exactly one video.');
      return;
    }

    const answers = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (postType === 'poll' && (answers.length < 2 || answers.length > 6)) {
      setErrorMessage('A poll needs between two and six answer options.');
      return;
    }

    setBusy(true);
    try {
      const mediaItems = [];
      for (const item of media) {
        mediaItems.push(await uploadPostMedia(item.uri, item.mediaType));
      }
      const created = await apiRequest<FeedPost>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          caption,
          mediaItems,
          mediaType: postType,
          pollOptions: answers,
          audience,
          location,
        }),
      });
      setCaption('');
      setLocation('');
      setMedia([]);
      setPollOptions(['', '']);
      onPost(created);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your post could not be published.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.backButton}
            >
              <ArrowLeft color={colors.text} size={20} />
            </Pressable>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>SHARE WITH YOUR COMMUNITY</Text>
              <Text style={styles.title}>Create a post</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.typeSelector}>
              {postTypes.map((type) => {
                const selected = postType === type;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={type}
                    onPress={() => {
                      setPostType(type);
                      setMedia([]);
                      setErrorMessage(null);
                    }}
                    style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  >
                    {type === 'video' ? <Video color={selected ? colors.inverse : colors.textMuted} size={15} /> : null}
                    {type === 'photo' ? <ImagePlus color={selected ? colors.inverse : colors.textMuted} size={15} /> : null}
                    <Text style={[styles.typeButtonText, selected && styles.typeButtonTextSelected]}>
                      {formatPostType(type)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {postType === 'photo' || postType === 'video' ? (
              <View style={styles.mediaSection}>
                {media.length === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void chooseMedia()}
                    style={styles.uploadZone}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.text} />
                    ) : postType === 'video' ? (
                      <Video color={colors.textMuted} size={26} />
                    ) : (
                      <ImagePlus color={colors.textMuted} size={26} />
                    )}
                    <Text style={styles.uploadTitle}>
                      Choose {postType === 'photo' ? 'photos' : 'a video'}
                    </Text>
                    <Text style={styles.uploadHint}>
                      Media uploads directly to your private school community storage.
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <View style={styles.mediaHeader}>
                      <Text style={styles.mediaCount}>
                        {media.length} {postType === 'video' ? 'video' : media.length === 1 ? 'photo' : 'photos'} selected
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setMedia([])}
                        style={styles.textButton}
                      >
                        <Text style={styles.textButtonLabel}>Clear all</Text>
                      </Pressable>
                    </View>
                    <View style={styles.mediaGrid}>
                      {media.map((item) => (
                        <View key={item.id} style={styles.mediaCard}>
                          {item.mediaType === 'photo' ? (
                            <Image contentFit="cover" source={{ uri: item.uri }} style={styles.mediaPreview} />
                          ) : (
                            <View style={styles.videoPreview}>
                              <Video color={colors.text} size={26} />
                              <Text style={styles.videoPreviewLabel}>Video selected</Text>
                            </View>
                          )}
                          {item.mediaType === 'video' ? (
                            <View style={styles.videoPill}>
                              <Text style={styles.videoPillText}>Video</Text>
                            </View>
                          ) : null}
                          <Pressable
                            accessibilityLabel="Remove media"
                            accessibilityRole="button"
                            onPress={() => setMedia((current) => current.filter((entry) => entry.id !== item.id))}
                            style={styles.removeMedia}
                          >
                            <X color="#fff" size={14} />
                          </Pressable>
                        </View>
                      ))}
                      {postType === 'photo' && media.length < maxMediaItems ? (
                        <Pressable
                          accessibilityLabel="Add more photos"
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => void chooseMedia()}
                          style={styles.addMedia}
                        >
                          <Text style={styles.addMediaPlus}>+</Text>
                          <Text style={styles.addMediaLabel}>Add more</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Caption</Text>
              <TextInput
                maxLength={3000}
                multiline
                onChangeText={setCaption}
                placeholder={postType === 'question' ? 'Ask your school community…' : 'What would you like to share?'}
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.captionInput]}
                textAlignVertical="top"
                value={caption}
              />
              <Text style={styles.characterCount}>{caption.length}/3000</Text>
            </View>

            {postType === 'poll' ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Poll answers</Text>
                {pollOptions.map((option, index) => (
                  <TextInput
                    key={index}
                    maxLength={100}
                    onChangeText={(value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                    value={option}
                  />
                ))}
                {pollOptions.length < 6 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPollOptions((current) => [...current, ''])}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonLabel}>+ Add option</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location (optional)</Text>
              <TextInput
                maxLength={120}
                onChangeText={setLocation}
                placeholder="Add a campus location"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={location}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Audience</Text>
              <View style={styles.audienceOptions}>
                {audiences.map((option) => {
                  const selected = audience === option;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option}
                      onPress={() => setAudience(option)}
                      style={[styles.audienceButton, selected && styles.audienceButtonSelected]}
                    >
                      <Text style={[styles.audienceLabel, selected && styles.audienceLabelSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.footnote}>
              <Text style={styles.footnoteCheck}>✓</Text>
              <Text style={styles.footnoteText}>
                Audience permissions are enforced by the API and database policies.
              </Text>
            </View>

            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void publish()}
              style={[styles.publishButton, busy && styles.publishButtonDisabled]}
            >
              {busy ? <ActivityIndicator color={colors.inverse} /> : null}
              <Text style={styles.publishButtonLabel}>
                {busy ? 'Publishing…' : 'Publish to Common Room'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { gap: 18, padding: 18, paddingBottom: 32 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  heading: { flex: 1, gap: 4 },
  eyebrow: { color: colors.textFaint, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 20,
    padding: 16,
  },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  typeButtonSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  typeButtonTextSelected: { color: colors.inverse },
  mediaSection: { gap: 12 },
  uploadZone: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 9,
    justifyContent: 'center',
    minHeight: 150,
    padding: 20,
  },
  uploadTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  uploadHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  mediaHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  mediaCount: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  textButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  textButtonLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  mediaCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    height: 92,
    overflow: 'hidden',
    position: 'relative',
    width: '30%',
  },
  mediaPreview: { height: '100%', width: '100%' },
  videoPreview: { alignItems: 'center', flex: 1, gap: 7, justifyContent: 'center' },
  videoPreviewLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  videoPill: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    bottom: 5,
    left: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: 'absolute',
  },
  videoPillText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  removeMedia: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 24,
  },
  addMedia: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 11,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 92,
    justifyContent: 'center',
    width: '30%',
  },
  addMediaLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 4 },
  addMediaPlus: { color: colors.textMuted, fontSize: 24, lineHeight: 25 },
  field: { gap: 8 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  captionInput: { minHeight: 112 },
  characterCount: { alignSelf: 'flex-end', color: colors.textFaint, fontSize: 11 },
  audienceOptions: { flexDirection: 'row', gap: 8 },
  audienceButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 11,
  },
  audienceButtonSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  audienceLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  audienceLabelSelected: { color: colors.inverse },
  footnote: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  footnoteCheck: { color: colors.textMuted, fontSize: 17, fontWeight: '800' },
  footnoteText: { color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 16 },
  errorMessage: { color: '#ff7b72', fontSize: 13, lineHeight: 19 },
  publishButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 11,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  publishButtonDisabled: { opacity: 0.7 },
  publishButtonLabel: { color: colors.inverse, fontSize: 14, fontWeight: '800' },
});
