import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ChevronDown,
  Globe,
  ImagePlus,
  MapPin,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Smile,
  Video,
  X,
  Zap,
} from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
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
import { searchLocations, LocationSuggestion } from '../../services/locationService';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppColors, radius } from '../../theme/tokens';
import { FeedPost, FeedPostType } from '../../types/domain';
import { MiniVideoEditorModal, SoundTrack } from './MiniVideoEditorModal';

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

const postTypes: FeedPostType[] = ['photo', 'video', 'text'];
const audiences: Audience[] = ['Public', 'Followers', 'Private'];
const maxMediaItems = 10;

export function CreateFlowScreen({ onClose, onPost }: CreateFlowScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [postType, setPostType] = useState<FeedPostType>('photo');
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState<Audience>('Public');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Location Autocomplete State
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audience Dropdown State
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);

  // Auto-Cut Modal State
  const [autoCutModalOpen, setAutoCutModalOpen] = useState(false);
  const [attachedSound, setAttachedSound] = useState<SoundTrack | null>(null);

  // Debounced location search
  useEffect(() => {
    if (!locationQuery || locationQuery.length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearchingLocation(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocations(locationQuery);
      setLocationSuggestions(results);
      setIsSearchingLocation(false);
      setShowLocationDropdown(results.length > 0);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [locationQuery]);

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

  const handleSelectLocation = (item: LocationSuggestion) => {
    setLocation(item.name);
    setLocationQuery(item.name);
    setShowLocationDropdown(false);
  };

  const publish = async () => {
    setErrorMessage(null);
    if (!caption.trim() && media.length === 0) {
      setErrorMessage('Add a caption or media before publishing.');
      return;
    }
    if (caption.length > 500) {
      setErrorMessage('Captions can be up to 500 characters.');
      return;
    }
    if (postType === 'video' && (media.length !== 1 || media[0]?.mediaType !== 'video')) {
      setErrorMessage('A video post must contain exactly one video.');
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
          audience,
          location: location || locationQuery,
        }),
      });
      setCaption('');
      setLocation('');
      setLocationQuery('');
      setMedia([]);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar matching screenshot */}
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.backButton}
            >
              <ArrowLeft color="#ffffff" size={22} />
            </Pressable>
            <View style={styles.headingWrap}>
              <Text style={styles.eyebrow}>SHARE WITH YOUR COMMUNITY</Text>
              <Text style={styles.title}>Create a post</Text>
              <Text style={styles.subtitle}>Share your thoughts, moments, questions and more...</Text>
            </View>
            <Pressable accessibilityRole="button" style={styles.moreButton}>
              <MoreHorizontal color="#8e95a5" size={20} />
            </Pressable>
          </View>

          {/* Type Selector Pills: Photo, Video, Aa Text */}
          <View style={styles.typeSelectorRow}>
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
                  style={[styles.typePill, selected && styles.typePillSelected]}
                >
                  {type === 'photo' ? (
                    <ImagePlus color={selected ? '#000000' : '#8e95a5'} size={15} />
                  ) : type === 'video' ? (
                    <Video color={selected ? '#000000' : '#8e95a5'} size={15} />
                  ) : (
                    <Text style={[styles.typeTextIcon, selected && styles.typeTextIconSelected]}>Aa</Text>
                  )}
                  <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                    {type === 'photo' ? 'Photo' : type === 'video' ? 'Video' : 'Text'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Media Upload Box (Photo & Video mode) */}
          {postType === 'photo' || postType === 'video' ? (
            <View style={styles.mediaContainer}>
              {media.length === 0 ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void chooseMedia()}
                  style={styles.uploadZone}
                >
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.uploadBadge}>
                      <ImagePlus color="#ffffff" size={26} strokeWidth={1.8} />
                    </View>
                  )}
                  <Text style={styles.uploadTitle}>Add photos or videos</Text>
                  <Text style={styles.uploadHint}>Tap to upload or choose from your gallery</Text>
                </Pressable>
              ) : (
                <View>
                  {/* Media header with count & Auto-Cut button */}
                  <View style={styles.mediaHeaderRow}>
                    <Text style={styles.mediaCountText}>
                      {media.length} {media.length === 1 ? 'item' : 'items'} selected
                    </Text>

                    {/* Auto-Cut Trigger Button */}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAutoCutModalOpen(true)}
                      style={styles.autoCutTriggerPill}
                    >
                      <Zap size={13} color="#f59e0b" fill="#f59e0b" />
                      <Text style={styles.autoCutTriggerText}>Auto-Cut / Reel</Text>
                    </Pressable>

                    <Pressable accessibilityRole="button" onPress={() => setMedia([])}>
                      <Text style={styles.clearAllText}>Clear all</Text>
                    </Pressable>
                  </View>

                  {/* Attached Sound Indicator */}
                  {attachedSound ? (
                    <View style={styles.attachedSoundPill}>
                      <Zap size={12} color="#f59e0b" />
                      <Text style={styles.attachedSoundText}>Sound: {attachedSound.title}</Text>
                    </View>
                  ) : null}

                  {/* Thumbnails grid */}
                  <View style={styles.mediaGrid}>
                    {media.map((item) => (
                      <View key={item.id} style={styles.mediaThumbCard}>
                        {item.mediaType === 'photo' ? (
                          <Image contentFit="cover" source={{ uri: item.uri }} style={styles.mediaThumb} />
                        ) : (
                          <View style={styles.videoThumb}>
                            <Video color="#ffffff" size={22} />
                            <Text style={styles.videoThumbText}>Video</Text>
                          </View>
                        )}
                        <Pressable
                          accessibilityLabel="Remove"
                          onPress={() => setMedia((prev) => prev.filter((m) => m.id !== item.id))}
                          style={styles.removeMediaBtn}
                        >
                          <X color="#ffffff" size={12} />
                        </Pressable>
                      </View>
                    ))}

                    {postType === 'photo' && media.length < maxMediaItems ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void chooseMedia()}
                        style={styles.addMoreBtn}
                      >
                        <Text style={styles.addMorePlus}>+</Text>
                        <Text style={styles.addMoreText}>Add more</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {/* Caption Field */}
          <View style={styles.fieldSection}>
            <View style={styles.captionHeaderRow}>
              <Text style={styles.fieldLabel}>Caption</Text>
              <Text style={styles.charCountText}>{caption.length}/500</Text>
            </View>
            <View style={styles.captionInputWrap}>
              <TextInput
                maxLength={500}
                multiline
                numberOfLines={4}
                onChangeText={setCaption}
                placeholder="What would you like to share?"
                placeholderTextColor="#64748b"
                style={styles.captionInput}
                textAlignVertical="top"
                value={caption}
              />
              <Pressable
                accessibilityLabel="Add emoji"
                onPress={() => setCaption((prev) => prev + ' 😊')}
                style={styles.emojiBtn}
              >
                <Smile size={18} color="#8e95a5" />
              </Pressable>
            </View>
          </View>

          {/* Location Field with Real-Time Autocomplete */}
          <View style={styles.fieldSection}>
            <View style={styles.labelWithIcon}>
              <MapPin size={14} color="#8e95a5" />
              <Text style={styles.fieldLabel}>Location (optional)</Text>
            </View>
            <View style={styles.locationInputBox}>
              <TextInput
                maxLength={120}
                onChangeText={(text) => {
                  setLocationQuery(text);
                  setLocation(text);
                }}
                placeholder="Add a location"
                placeholderTextColor="#64748b"
                style={styles.locationInput}
                value={locationQuery}
              />
              {isSearchingLocation ? (
                <ActivityIndicator size="small" color="#8e95a5" style={{ marginRight: 8 }} />
              ) : (
                <MapPin size={16} color="#8e95a5" style={{ marginRight: 8 }} />
              )}
            </View>

            {/* Location Autocomplete Dropdown */}
            {showLocationDropdown && locationSuggestions.length > 0 ? (
              <View style={styles.dropdownContainer}>
                {locationSuggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => handleSelectLocation(item)}
                    style={styles.dropdownRow}
                  >
                    <MapPin size={13} color={item.isCustom ? '#f59e0b' : '#3b82f6'} />
                    <View style={styles.dropdownTextWrap}>
                      <Text style={[styles.dropdownName, item.isCustom && styles.dropdownCustomName]}>
                        {item.isCustom ? `Use "${item.name}"` : item.name}
                      </Text>
                      <Text style={styles.dropdownDetail}>{item.detail}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Audience Selector Card */}
          <View style={styles.fieldSection}>
            <View style={styles.labelWithIcon}>
              <Globe size={14} color="#8e95a5" />
              <Text style={styles.fieldLabel}>Audience</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAudienceDropdown((prev) => !prev)}
              style={styles.audienceSelectBox}
            >
              <View style={styles.audienceLeft}>
                <Globe size={16} color="#ffffff" />
                <Text style={styles.audienceSelectedText}>{audience}</Text>
              </View>
              <ChevronDown size={16} color="#8e95a5" />
            </Pressable>

            {showAudienceDropdown ? (
              <View style={styles.audienceMenu}>
                {audiences.map((opt) => (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    onPress={() => {
                      setAudience(opt);
                      setShowAudienceDropdown(false);
                    }}
                    style={[styles.audienceOptionRow, audience === opt && styles.audienceOptionRowSelected]}
                  >
                    <Text style={[styles.audienceOptionText, audience === opt && styles.audienceOptionTextSelected]}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.audienceFootnote}>
              <Text style={styles.footnoteInfoIcon}>ⓘ</Text>
              <Text style={styles.footnoteInfoText}>
                Your post will be visible to everyone on the community.
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Full-width Post Button matching screenshot */}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void publish()}
            style={[styles.postButton, busy && styles.postButtonDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Send size={15} color="#000000" strokeWidth={2.6} />
                <Text style={styles.postButtonText}>Post</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auto-Cut Modal */}
      <MiniVideoEditorModal
        visible={autoCutModalOpen}
        mediaList={media}
        onClose={() => setAutoCutModalOpen(false)}
        onApplyReel={(title, track) => {
          setAttachedSound(track);
          setCaption((prev) => (prev ? `${prev} ⚡ ${title}` : `⚡ ${title}`));
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: '#0b0d11',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginTop: 4,
    width: 36,
  },
  headingWrap: {
    flex: 1,
    marginLeft: 8,
  },
  eyebrow: {
    color: '#8e95a5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  moreButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  typePillSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  typePillText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '700',
  },
  typePillTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  typeTextIcon: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '800',
  },
  typeTextIconSelected: {
    color: '#000000',
  },
  mediaContainer: {
    marginBottom: 16,
  },
  uploadZone: {
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 36,
  },
  uploadBadge: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
    width: 40,
  },
  uploadTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  uploadHint: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 4,
  },
  mediaHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mediaCountText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  autoCutTriggerPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  autoCutTriggerText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  clearAllText: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '600',
  },
  attachedSoundPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachedSoundText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbCard: {
    backgroundColor: '#131620',
    borderRadius: 12,
    height: 84,
    overflow: 'hidden',
    position: 'relative',
    width: '31%',
  },
  mediaThumb: {
    height: '100%',
    width: '100%',
  },
  videoThumb: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  videoThumbText: {
    color: '#8e95a5',
    fontSize: 10,
    fontWeight: '700',
  },
  removeMediaBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
  },
  addMoreBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: '31%',
  },
  addMorePlus: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  addMoreText: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 2,
  },
  fieldSection: {
    marginBottom: 16,
  },
  captionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  charCountText: {
    color: '#64748b',
    fontSize: 11,
  },
  captionInputWrap: {
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
  },
  captionInput: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    minHeight: 80,
    paddingRight: 28,
  },
  emojiBtn: {
    bottom: 10,
    position: 'absolute',
    right: 10,
  },
  labelWithIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  locationInputBox: {
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationInput: {
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  dropdownContainer: {
    backgroundColor: '#161922',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownCustomName: {
    color: '#f59e0b',
  },
  dropdownDetail: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 1,
  },
  audienceSelectBox: {
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  audienceLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  audienceSelectedText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  audienceMenu: {
    backgroundColor: '#161922',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  audienceOptionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  audienceOptionRowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  audienceOptionText: {
    color: '#8e95a5',
    fontSize: 13,
    fontWeight: '600',
  },
  audienceOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  audienceFootnote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  footnoteInfoIcon: {
    color: '#64748b',
    fontSize: 12,
  },
  footnoteInfoText: {
    color: '#64748b',
    fontSize: 11,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    marginBottom: 14,
    padding: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
    width: '100%',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});
