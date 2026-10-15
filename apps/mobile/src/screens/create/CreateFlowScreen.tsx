import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ImageStyle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { FeedPost } from '../../types/domain';

type MediaItem = {
  uri: string;
  type: 'photo' | 'video';
};

type CreateFlowScreenProps = {
  onClose: () => void;
  onPost: (post: FeedPost) => void;
};

type CreatorStep = 'camera' | 'details' | 'preview' | 'publishing' | 'posted';
type Audience = 'Public' | 'Followers' | 'Private';

const MAX_MEDIA_ITEMS = 10;
const audienceOptions: Audience[] = ['Public', 'Followers', 'Private'];
const shareOptions = ['WhatsApp', 'Facebook', 'SMS'];

export function CreateFlowScreen({ onClose, onPost }: CreateFlowScreenProps) {
  const { colors } = useAppTheme();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [step, setStep] = useState<CreatorStep>('camera');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedSound, setSelectedSound] = useState('Original sound');
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState<Audience>('Public');
  const [audienceSheetOpen, setAudienceSheetOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareTo, setShareTo] = useState<string | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReuse, setAllowReuse] = useState(true);
  const [saveToDevice, setSaveToDevice] = useState(false);
  const [adultOnly, setAdultOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completedPost, setCompletedPost] = useState<FeedPost | null>(null);

  const blackStyles = createStyles();
  const colorsStyles = createDetailsStyles();
  const isCameraStep = step === 'camera';
  const showCamera = step === 'camera' && cameraPermission?.granted;

  const addMedia = (items: MediaItem[]) => {
    setMedia((current) => {
      if (current.length + items.length > MAX_MEDIA_ITEMS) {
        setErrorMessage(`A post can contain up to ${MAX_MEDIA_ITEMS} media items.`);
        return current;
      }
      const mediaTypes = new Set([...current, ...items].map((item) => item.type));
      if (mediaTypes.size > 1) {
        setErrorMessage('Add either photos or one video to a post. Remove existing items before changing media type.');
        return current;
      }
      if ([...current, ...items].some((item) => item.type === 'video') && current.length + items.length > 1) {
        setErrorMessage('A video post can contain one video. Remove other items before adding a video.');
        return current;
      }
      setErrorMessage(null);
      return [...current, ...items];
    });
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (moreOptionsOpen || shareSheetOpen || audienceSheetOpen || soundSheetOpen) return false;
      if (step === 'details' || step === 'preview') {
        setStep(step === 'preview' ? 'details' : 'camera');
        return true;
      }
      if (step === 'camera') {
        onClose();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [audienceSheetOpen, moreOptionsOpen, onClose, shareSheetOpen, soundSheetOpen, step]);

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA_ITEMS) {
      setErrorMessage(`A post can contain up to ${MAX_MEDIA_ITEMS} media items.`);
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: MAX_MEDIA_ITEMS - media.length,
        quality: 0.9,
      });
      if (!result.canceled) {
        const videos = result.assets.filter((asset) => asset.type === 'video');
        if (videos.length > 0 && result.assets.length > 1) {
          setErrorMessage('Select one video at a time. Photo posts can include up to ten images.');
          return;
        }
        addMedia(result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'photo',
        })));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open your media library.');
    } finally {
      setBusy(false);
    }
  };

  const capturePhoto = async () => {
    if (media.length >= MAX_MEDIA_ITEMS) {
      setErrorMessage(`A post can contain up to ${MAX_MEDIA_ITEMS} media items.`);
      return;
    }
    if (!cameraRef.current || !cameraReady) {
      setErrorMessage('Camera is still starting. Please try again in a moment.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (picture?.uri) addMedia([{ uri: picture.uri, type: 'photo' }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The photo could not be captured.');
    } finally {
      setBusy(false);
    }
  };

  const toggleVideoRecording = async () => {
    if (!cameraRef.current || !cameraReady) {
      setErrorMessage('Camera is still starting. Please try again in a moment.');
      return;
    }
    setErrorMessage(null);
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    if (!microphonePermission?.granted) {
      const permission = await requestMicrophonePermission();
      if (!permission.granted) {
        setErrorMessage('Microphone access is required to record video with sound.');
        return;
      }
    }

    setRecording(true);
    try {
      const recordingResult = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (recordingResult?.uri) {
        if (media.length > 0) {
          setErrorMessage('Remove the current photos before recording a video post.');
        } else {
          setMedia([{ uri: recordingResult.uri, type: 'video' }]);
          setStep('details');
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The video could not be recorded.');
    } finally {
      setRecording(false);
    }
  };

  const moveToDetails = () => {
    if (media.length === 0) {
      setErrorMessage('Capture a photo or video, or choose media from your device first.');
      return;
    }
    setStep('details');
  };

  const addCaptionToken = (token: '#' | '@') => {
    setCaption((current) => `${current}${current.endsWith(' ') || !current ? '' : ' '}${token}`);
  };

  const publishLocally = async () => {
    if (media.length === 0) {
      setErrorMessage('Add at least one photo or video before sharing.');
      return;
    }
    setErrorMessage(null);
    setStep('publishing');
    const firstMedia = media[0];
    const cleanCaption = [title.trim(), caption.trim()].filter(Boolean).join('\n');
    const createdPost: FeedPost = {
      id: `local-${Date.now()}`,
      authorUsername: 'you',
      authorName: 'You',
      school: 'Your school',
      caption: cleanCaption || 'A new campus moment',
      mediaUrl: firstMedia.uri,
      mediaType: firstMedia.type,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      tags: caption.match(/#[\p{L}\p{N}_]+/gu) ?? [],
      time: 'Just now',
      location: location.trim() || undefined,
      mediaItems: media.map((item) => ({
        uri: item.uri,
        mediaType: item.type,
      })),
      audience,
      ageRestricted: adultOnly,
      allowComments,
      allowReuse,
      selectedSound,
      shareTo,
    };

    setStep('publishing');
    try {
      if (saveToDevice) {
        if (Platform.OS === 'web') {
          throw new Error('Saving directly to your device library is available in the native iOS and Android app.');
        }
        const MediaLibrary = await import('expo-media-library');
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Device photo-library permission was not granted. Allow access or turn off Save to device.');
        }
        for (const item of media) {
          await MediaLibrary.saveToLibraryAsync(item.uri);
        }
      }
      setCompletedPost(createdPost);
      setTimeout(() => setStep('posted'), 900);
    } catch (error) {
      setStep('details');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the selected media.');
    }
  };

  if (step === 'posted' && completedPost) {
    return (
      <View style={blackStyles.posted}>
        <Text style={blackStyles.postedCheck}>✓</Text>
        <Text style={blackStyles.publishingTitle}>Ready in your Home preview</Text>
        <Text style={blackStyles.publishingCopy}>
          This post is saved only in this app session. It has not been uploaded, and audience settings are not enforced.
        </Text>
        <Pressable style={blackStyles.primaryButton} onPress={() => onPost(completedPost)}>
          <Text style={blackStyles.primaryButtonText}>View in Home</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'publishing') {
    return (
      <View style={blackStyles.publishing}>
        <ActivityIndicator color="#FE2C55" size="large" />
        <Text style={blackStyles.publishingTitle}>{saveToDevice ? 'Saving your media…' : 'Preparing your preview…'}</Text>
        <Text style={blackStyles.publishingCopy}>
          This preview does not upload or publish to a server yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={blackStyles.screen}>
      {isCameraStep ? (
        <>
          {showCamera ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode={captureMode === 'video' ? 'video' : 'picture'}
              mute={false}
              onCameraReady={() => setCameraReady(true)}
            />
          ) : (
            <View style={blackStyles.permission}>
              <Text style={blackStyles.permissionTitle}>Camera access needed</Text>
              <Text style={blackStyles.permissionCopy}>
                Allow camera access to capture a photo or video. You can also choose media from your device.
              </Text>
              <Pressable style={blackStyles.primaryButton} onPress={requestCameraPermission}>
                <Text style={blackStyles.primaryButtonText}>Allow camera</Text>
              </Pressable>
              <Pressable style={blackStyles.outlineButton} onPress={pickMedia}>
                <Text style={blackStyles.outlineButtonText}>Choose from device</Text>
              </Pressable>
              <Pressable style={blackStyles.closeButton} onPress={onClose} accessibilityLabel="Close creator">
                <Text style={blackStyles.iconText}>×</Text>
              </Pressable>
            </View>
          )}

          {showCamera ? (
            <>
              <View style={blackStyles.cameraHeader}>
                <Pressable style={blackStyles.iconButton} onPress={onClose} accessibilityLabel="Close camera">
                  <Text style={blackStyles.iconText}>×</Text>
                </Pressable>
                <Pressable style={blackStyles.soundButton} onPress={() => setSoundSheetOpen(true)}>
                  <Text style={blackStyles.soundButtonText}>♫  {selectedSound}</Text>
                </Pressable>
                <Pressable
                  style={blackStyles.iconButton}
                  onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')}
                  accessibilityLabel="Switch front or back camera"
                >
                  <Text style={blackStyles.iconText}>↻</Text>
                </Pressable>
              </View>

              <View style={blackStyles.cameraTools}>
                <Pressable style={blackStyles.toolButton} onPress={() => setFlash((current) => current === 'off' ? 'on' : 'off')}>
                  <Text style={blackStyles.toolIcon}>{flash === 'on' ? 'ϟ' : 'ϟ̸'}</Text>
                  <Text style={blackStyles.toolLabel}>{flash === 'on' ? 'Flash on' : 'Flash off'}</Text>
                </Pressable>
                <Pressable style={blackStyles.toolButton} onPress={pickMedia}>
                  <Text style={blackStyles.toolIcon}>▣</Text>
                  <Text style={blackStyles.toolLabel}>Upload</Text>
                </Pressable>
                <Pressable style={blackStyles.toolButton} onPress={() => setErrorMessage('Timer controls are coming with the full capture editor.')}>
                  <Text style={blackStyles.toolIcon}>◷</Text>
                  <Text style={blackStyles.toolLabel}>Timer</Text>
                </Pressable>
              </View>

              <View style={blackStyles.cameraFooter}>
                <View style={blackStyles.mediaStrip}>
                  {media.slice(-5).map((item, index) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove captured item ${index + 1}`}
                      key={`${item.uri}-${index}`}
                      onPress={() => setMedia((current) => current.filter((entry) => entry.uri !== item.uri))}
                    >
                      <Image source={{ uri: item.uri }} style={blackStyles.thumbnail} contentFit="cover" />
                    </Pressable>
                  ))}
                  <Text style={blackStyles.mediaCount}>{media.length}/{MAX_MEDIA_ITEMS}</Text>
                </View>
                <View style={blackStyles.captureRow}>
                  <Pressable style={blackStyles.galleryButton} onPress={pickMedia}>
                    <Text style={blackStyles.galleryIcon}>▧</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={recording ? 'Stop recording' : captureMode === 'photo' ? 'Take photo' : 'Start recording'}
                    disabled={busy}
                    onPress={captureMode === 'photo' ? capturePhoto : toggleVideoRecording}
                    style={[blackStyles.shutter, recording && blackStyles.recordingShutter]}
                  >
                    <View style={[blackStyles.shutterInner, recording && blackStyles.recordingInner]} />
                  </Pressable>
                  <Pressable
                    style={blackStyles.nextButton}
                    onPress={moveToDetails}
                    disabled={media.length === 0}
                  >
                    <Text style={[blackStyles.nextText, media.length === 0 && blackStyles.disabledText]}>Next</Text>
                  </Pressable>
                </View>
                <View style={blackStyles.modeRow}>
                  {(['video', 'photo'] as const).map((mode) => (
                    <Pressable key={mode} onPress={() => setCaptureMode(mode)} style={blackStyles.modeButton}>
                      <Text style={[blackStyles.modeText, captureMode === mode && blackStyles.modeActive]}>
                        {mode === 'video' ? 'VIDEO' : 'PHOTO'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={blackStyles.cameraTab}>CAMERA     <Text style={blackStyles.dimText}>CREATE</Text></Text>
              </View>
            </>
          ) : null}
        </>
      ) : (
        <KeyboardAvoidingView
          style={colorsStyles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={colorsStyles.header}>
            <Pressable
              style={colorsStyles.backButton}
              onPress={() => setStep(step === 'preview' ? 'details' : 'camera')}
              accessibilityLabel="Go back"
            >
              <Text style={colorsStyles.backText}>‹</Text>
            </Pressable>
            <Text style={colorsStyles.headerTitle}>{step === 'preview' ? 'Preview' : 'New post'}</Text>
            <Pressable onPress={() => setStep(step === 'preview' ? 'details' : 'preview')}>
              <Text style={colorsStyles.previewAction}>{step === 'preview' ? 'Edit' : 'Preview'}</Text>
            </Pressable>
          </View>

          {step === 'preview' ? (
            <View style={colorsStyles.previewPage}>
              {media[0]?.type === 'video' ? (
                <LocalVideoPreview uri={media[0].uri} style={colorsStyles.previewImage} />
              ) : (
                <Image source={{ uri: media[0]?.uri }} style={colorsStyles.previewImage} contentFit="cover" />
              )}
              <View style={colorsStyles.previewCaption}>
                <Text style={colorsStyles.previewTitle}>{title || 'Your post'}</Text>
                <Text style={colorsStyles.previewBody}>{caption || 'Add a caption to tell your story.'}</Text>
                {location ? <Text style={colorsStyles.previewLocation}>⌖  {location}</Text> : null}
                <Text style={colorsStyles.previewMeta}>{audience} · {adultOnly ? '18+' : 'All ages'}</Text>
              </View>
              <Pressable style={colorsStyles.postButton} onPress={publishLocally}>
                <Text style={colorsStyles.postButtonText}>Share to Home preview</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView contentContainerStyle={colorsStyles.detailsContent} keyboardShouldPersistTaps="handled">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={colorsStyles.mediaRow}>
                  {media.map((item, index) => (
                    <View key={`${item.uri}-${index}`} style={colorsStyles.mediaTile}>
                      <Image source={{ uri: item.uri }} style={colorsStyles.mediaImage} contentFit="cover" />
                      {item.type === 'video' ? <Text style={colorsStyles.videoBadge}>VIDEO</Text> : null}
                      <Pressable
                        accessibilityLabel={`Remove media item ${index + 1}`}
                        onPress={() => setMedia((current) => current.filter((entry) => entry.uri !== item.uri))}
                        style={colorsStyles.removeMedia}
                      >
                        <Text style={colorsStyles.removeMediaText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                  {media.length < MAX_MEDIA_ITEMS ? (
                    <Pressable style={colorsStyles.addMediaTile} onPress={pickMedia}>
                      <Text style={colorsStyles.addMediaText}>＋</Text>
                      <Text style={colorsStyles.addMediaLabel}>Add media</Text>
                    </Pressable>
                  ) : null}
                </ScrollView>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Add a catchy title"
                  placeholderTextColor="#9a9a9a"
                  style={colorsStyles.titleInput}
                  maxLength={80}
                />
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Write a caption. Add hashtags and mention people."
                  placeholderTextColor="#9a9a9a"
                  style={colorsStyles.captionInput}
                  multiline
                  maxLength={2200}
                  textAlignVertical="top"
                />

                <View style={colorsStyles.captionTools}>
                  <Pressable onPress={() => addCaptionToken('#')} style={colorsStyles.toolChip}>
                    <Text style={colorsStyles.toolChipText}>#  Hashtag</Text>
                  </Pressable>
                  <Pressable onPress={() => addCaptionToken('@')} style={colorsStyles.toolChip}>
                    <Text style={colorsStyles.toolChipText}>@  Mention</Text>
                  </Pressable>
                  <Text style={colorsStyles.captionCount}>{caption.length}/2200</Text>
                </View>

                <Pressable style={colorsStyles.settingRow} onPress={() => setSoundSheetOpen(true)}>
                  <Text style={colorsStyles.settingIcon}>♫</Text>
                  <View style={colorsStyles.settingCopy}>
                    <Text style={colorsStyles.settingTitle}>Sound</Text>
                    <Text style={colorsStyles.settingHint}>{selectedSound}</Text>
                  </View>
                  <Text style={colorsStyles.chevron}>›</Text>
                </Pressable>
                <Pressable style={colorsStyles.settingRow} onPress={() => setAudienceSheetOpen(true)}>
                  <Text style={colorsStyles.settingIcon}>◎</Text>
                  <View style={colorsStyles.settingCopy}>
                    <Text style={colorsStyles.settingTitle}>{audience} can view this post</Text>
                    <Text style={colorsStyles.settingHint}>Choose who can see your post</Text>
                  </View>
                  <Text style={colorsStyles.chevron}>›</Text>
                </Pressable>
                <Pressable style={colorsStyles.settingRow} onPress={() => setMoreOptionsOpen(true)}>
                  <Text style={colorsStyles.settingIcon}>⚙</Text>
                  <View style={colorsStyles.settingCopy}>
                    <Text style={colorsStyles.settingTitle}>More options</Text>
                    <Text style={colorsStyles.settingHint}>
                      {adultOnly ? 'Limited to people 18 and older' : 'Comments, reuse, save and age controls'}
                    </Text>
                  </View>
                  <Text style={colorsStyles.chevron}>›</Text>
                </Pressable>
                <Pressable style={colorsStyles.settingRow} onPress={() => setShareSheetOpen(true)}>
                  <Text style={colorsStyles.settingIcon}>➤</Text>
                  <View style={colorsStyles.settingCopy}>
                    <Text style={colorsStyles.settingTitle}>Share to</Text>
                    <Text style={colorsStyles.settingHint}>{shareTo || 'Choose another app after posting'}</Text>
                  </View>
                  <Text style={colorsStyles.chevron}>›</Text>
                </Pressable>
                <Pressable style={colorsStyles.settingRow} onPress={() => setErrorMessage('Location directory search needs the Schoolmate locations API. You can enter a location in the field below for this preview.')}>
                  <Text style={colorsStyles.settingIcon}>⌖</Text>
                  <View style={colorsStyles.settingCopy}>
                    <Text style={colorsStyles.settingTitle}>Location</Text>
                    <Text style={colorsStyles.settingHint}>Add a school or campus location</Text>
                  </View>
                  <Text style={colorsStyles.chevron}>›</Text>
                </Pressable>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location for preview"
                  placeholderTextColor="#9a9a9a"
                  style={colorsStyles.locationInput}
                />
                <Text style={colorsStyles.apiNote}>
                  Music licensing and the nationwide school/location directory are not connected yet. Only choose audio you have rights to use.
                </Text>
                {errorMessage ? <Text accessibilityLiveRegion="polite" style={colorsStyles.error}>{errorMessage}</Text> : null}
              </ScrollView>

              <View style={colorsStyles.footer}>
                <Pressable
                  style={colorsStyles.draftButton}
                  onPress={() => setErrorMessage('Drafts are not persisted yet; a local draft store has not been connected.')}
                >
                  <Text style={colorsStyles.draftButtonText}>Save draft</Text>
                </Pressable>
                <Pressable style={colorsStyles.postButton} onPress={publishLocally}>
                  <Text style={colorsStyles.postButtonText}>Share</Text>
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}

      {errorMessage && isCameraStep ? (
        <View accessibilityLiveRegion="polite" style={blackStyles.cameraError}>
          <Text style={blackStyles.cameraErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <CreatorSheet visible={soundSheetOpen} title="Add sound" onClose={() => setSoundSheetOpen(false)}>
        <Text style={colorsStyles.sheetNote}>
          No licensed music API is configured. We will not show tracks as free without verified rights.
        </Text>
        <Pressable style={colorsStyles.choiceRow} onPress={() => { setSelectedSound('Original sound'); setSoundSheetOpen(false); }}>
          <Text style={colorsStyles.choiceTitle}>Original sound</Text>
          <Text style={colorsStyles.choiceHint}>Use the audio captured with your video</Text>
          {selectedSound === 'Original sound' ? <Text style={colorsStyles.selectedMark}>✓</Text> : null}
        </Pressable>
        <View style={colorsStyles.disabledChoice}>
          <Text style={colorsStyles.choiceTitle}>Recommended music</Text>
          <Text style={colorsStyles.choiceHint}>Connect a licensed catalog to discover and preview music.</Text>
        </View>
      </CreatorSheet>

      <CreatorSheet visible={audienceSheetOpen} title="Who can view this post?" onClose={() => setAudienceSheetOpen(false)}>
        {audienceOptions.map((option) => (
          <Pressable
            key={option}
            style={colorsStyles.choiceRow}
            onPress={() => { setAudience(option); setAudienceSheetOpen(false); }}
          >
            <Text style={colorsStyles.choiceTitle}>{option}</Text>
            <Text style={colorsStyles.choiceHint}>
              {option === 'Public' ? 'Anyone can view' : option === 'Followers' ? 'Only your followers can view' : 'Only you can view'}
            </Text>
            {audience === option ? <Text style={colorsStyles.selectedMark}>✓</Text> : null}
          </Pressable>
        ))}
      </CreatorSheet>

      <CreatorSheet visible={shareSheetOpen} title="Share to" onClose={() => setShareSheetOpen(false)}>
        <Text style={colorsStyles.sheetNote}>A shareable post link requires the publishing API. Your selection is stored in this local preview only.</Text>
        {shareOptions.map((option) => (
          <Pressable
            key={option}
            style={colorsStyles.choiceRow}
            onPress={() => { setShareTo(shareTo === option ? null : option); setShareSheetOpen(false); }}
          >
            <Text style={colorsStyles.choiceTitle}>{option}</Text>
            <Text style={colorsStyles.choiceHint}>{shareTo === option ? 'Selected' : 'Select for later sharing'}</Text>
            {shareTo === option ? <Text style={colorsStyles.selectedMark}>✓</Text> : null}
          </Pressable>
        ))}
      </CreatorSheet>

      <CreatorSheet visible={moreOptionsOpen} title="More options" onClose={() => setMoreOptionsOpen(false)}>
        <OptionToggle title="Allow comments" detail="Let people comment on this post." value={allowComments} onChange={setAllowComments} />
        <OptionToggle title="Allow reuse" detail="Allow others to reuse this content." value={allowReuse} onChange={setAllowReuse} />
        <OptionToggle title="Save to device" detail="Save the media to your device after sharing." value={saveToDevice} onChange={setSaveToDevice} />
        <OptionToggle title="Audience controls · 18+" detail="Limit this post to people aged 18 or older." value={adultOnly} onChange={setAdultOnly} />
      </CreatorSheet>
    </View>
  );
}

function CreatorSheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={createStyles().sheetBackdrop} onPress={onClose}>
        <Pressable style={createDetailsStyles().sheet} onPress={() => undefined}>
          <View style={createDetailsStyles().sheetHeader}>
            <Text style={createDetailsStyles().sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close options">
              <Text style={createDetailsStyles().sheetClose}>×</Text>
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionToggle({ title, detail, value, onChange }: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={createDetailsStyles().optionRow}>
      <View style={createDetailsStyles().optionCopy}>
        <Text style={createDetailsStyles().choiceTitle}>{title}</Text>
        <Text style={createDetailsStyles().choiceHint}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#d0d0d0', true: '#25c3d7' }} />
    </View>
  );
}

function LocalVideoPreview({ uri, style }: { uri: string; style: ImageStyle & ViewStyle }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
  });
  return <VideoView player={player} style={style} contentFit="cover" nativeControls />;
}

const createStyles = () => StyleSheet.create({
  screen: { backgroundColor: '#000', flex: 1 },
  permission: { alignItems: 'center', backgroundColor: '#111', flex: 1, justifyContent: 'center', padding: 28 },
  permissionTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permissionCopy: { color: '#c5c5c5', fontSize: 14, lineHeight: 20, marginBottom: 20, marginTop: 12, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#fe2c55', borderRadius: 8, marginTop: 12, paddingHorizontal: 24, paddingVertical: 13, width: '100%' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  outlineButton: { alignItems: 'center', borderColor: '#777', borderRadius: 8, borderWidth: 1, marginTop: 10, paddingHorizontal: 24, paddingVertical: 13, width: '100%' },
  outlineButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeButton: { position: 'absolute', left: 18, top: 18 },
  cameraHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 16, position: 'absolute', right: 16, top: 20, zIndex: 2 },
  iconButton: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.32)', borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
  iconText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
  soundButton: { backgroundColor: 'rgba(30,30,30,0.72)', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11 },
  soundButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cameraTools: { gap: 17, position: 'absolute', right: 13, top: '22%', zIndex: 2 },
  toolButton: { alignItems: 'center', gap: 2 },
  toolIcon: { color: '#fff', fontSize: 24, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 5 },
  toolLabel: { color: '#fff', fontSize: 10, textShadowColor: '#000', textShadowRadius: 5 },
  cameraFooter: { backgroundColor: 'rgba(0,0,0,0.56)', bottom: 0, left: 0, paddingBottom: 16, paddingHorizontal: 16, paddingTop: 12, position: 'absolute', right: 0 },
  mediaStrip: { alignItems: 'center', flexDirection: 'row', gap: 8, height: 44, justifyContent: 'center', marginBottom: 12 },
  thumbnail: { borderColor: '#fff', borderRadius: 5, borderWidth: 1, height: 42, width: 36 },
  mediaCount: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 5 },
  captureRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  galleryButton: { alignItems: 'center', backgroundColor: '#343434', borderColor: '#aaa', borderRadius: 7, borderWidth: 1, height: 42, justifyContent: 'center', width: 48 },
  galleryIcon: { color: '#fff', fontSize: 22 },
  shutter: { alignItems: 'center', borderColor: '#fff', borderRadius: 40, borderWidth: 4, height: 78, justifyContent: 'center', width: 78 },
  recordingShutter: { borderColor: '#fe2c55' },
  shutterInner: { backgroundColor: '#fff', borderRadius: 31, height: 58, width: 58 },
  recordingInner: { backgroundColor: '#fe2c55', borderRadius: 10, height: 28, width: 28 },
  nextButton: { alignItems: 'center', justifyContent: 'center', minWidth: 48, paddingVertical: 12 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabledText: { color: '#777' },
  modeRow: { alignItems: 'center', flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 14 },
  modeButton: { paddingHorizontal: 8, paddingVertical: 6 },
  modeText: { color: '#aaa', fontSize: 11, fontWeight: '700' },
  modeActive: { color: '#fff', fontWeight: '900' },
  cameraTab: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 17, textAlign: 'center' },
  dimText: { color: '#8c8c8c', fontWeight: '600' },
  cameraError: { backgroundColor: 'rgba(0,0,0,0.8)', bottom: 185, left: 24, padding: 12, position: 'absolute', right: 24 },
  cameraErrorText: { color: '#fff', fontSize: 12, textAlign: 'center' },
  publishing: { alignItems: 'center', backgroundColor: '#000', flex: 1, justifyContent: 'center', padding: 28 },
  posted: { alignItems: 'center', backgroundColor: '#000', flex: 1, justifyContent: 'center', padding: 28 },
  postedCheck: { alignItems: 'center', backgroundColor: '#fe2c55', borderRadius: 36, color: '#fff', fontSize: 36, fontWeight: '900', height: 72, lineHeight: 72, marginBottom: 18, overflow: 'hidden', textAlign: 'center', width: 72 },
  publishingTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 20 },
  publishingCopy: { color: '#aaa', fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  sheetBackdrop: { backgroundColor: 'rgba(0,0,0,0.55)', flex: 1, justifyContent: 'flex-end' },
});

const createDetailsStyles = () => StyleSheet.create({
  page: { backgroundColor: '#fff', flex: 1 },
  header: { alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 16 },
  backButton: { width: 52 },
  backText: { color: '#111', fontSize: 34, lineHeight: 38 },
  headerTitle: { color: '#111', fontSize: 16, fontWeight: '800' },
  previewAction: { color: '#111', fontSize: 14, fontWeight: '700', textAlign: 'right', width: 52 },
  detailsContent: { paddingBottom: 16, paddingHorizontal: 16 },
  mediaRow: { gap: 9, paddingTop: 14 },
  mediaTile: { height: 116, position: 'relative', width: 100 },
  mediaImage: { backgroundColor: '#eee', borderRadius: 9, height: '100%', width: '100%' },
  videoBadge: { backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 4, bottom: 6, color: '#fff', fontSize: 9, fontWeight: '800', left: 6, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 3, position: 'absolute' },
  removeMedia: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, height: 24, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 24 },
  removeMediaText: { color: '#fff', fontSize: 20, lineHeight: 22 },
  addMediaTile: { alignItems: 'center', backgroundColor: '#f3f3f3', borderRadius: 9, height: 116, justifyContent: 'center', width: 100 },
  addMediaText: { color: '#111', fontSize: 30, lineHeight: 34 },
  addMediaLabel: { color: '#555', fontSize: 10, marginTop: 4 },
  titleInput: { borderBottomColor: '#eee', borderBottomWidth: 1, color: '#111', fontSize: 16, fontWeight: '700', minHeight: 47, marginTop: 5, paddingHorizontal: 4 },
  captionInput: { color: '#222', fontSize: 14, lineHeight: 21, minHeight: 105, paddingHorizontal: 4, paddingTop: 12 },
  captionTools: { alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingBottom: 13 },
  toolChip: { backgroundColor: '#f1f1f1', borderRadius: 6, paddingHorizontal: 11, paddingVertical: 8 },
  toolChipText: { color: '#222', fontSize: 12, fontWeight: '700' },
  captionCount: { color: '#888', flex: 1, fontSize: 11, textAlign: 'right' },
  settingRow: { alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 59 },
  settingIcon: { color: '#222', fontSize: 21, marginRight: 12, textAlign: 'center', width: 23 },
  settingCopy: { flex: 1, paddingVertical: 10 },
  settingTitle: { color: '#161616', fontSize: 13, fontWeight: '700' },
  settingHint: { color: '#8b8b8b', fontSize: 11, marginTop: 3 },
  chevron: { color: '#888', fontSize: 24, paddingLeft: 12 },
  locationInput: { backgroundColor: '#f4f4f4', borderRadius: 7, color: '#222', fontSize: 13, marginTop: 10, paddingHorizontal: 12, paddingVertical: 12 },
  apiNote: { color: '#888', fontSize: 11, lineHeight: 16, paddingTop: 14 },
  error: { color: '#c2183a', fontSize: 12, lineHeight: 17, paddingTop: 10 },
  footer: { alignItems: 'center', backgroundColor: '#fff', borderTopColor: '#eee', borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 10 },
  draftButton: { alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 28, flex: 1, justifyContent: 'center', minHeight: 48 },
  draftButtonText: { color: '#222', fontSize: 14, fontWeight: '800' },
  postButton: { alignItems: 'center', backgroundColor: '#fe2c55', borderRadius: 28, flex: 1, justifyContent: 'center', minHeight: 48 },
  postButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  previewPage: { backgroundColor: '#111', flex: 1, justifyContent: 'flex-end' },
  previewImage: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  previewCaption: { backgroundColor: 'rgba(0,0,0,0.52)', padding: 18 },
  previewTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  previewBody: { color: '#fff', fontSize: 14, lineHeight: 20, marginTop: 7 },
  previewLocation: { color: '#fff', fontSize: 12, marginTop: 9 },
  previewMeta: { color: '#ddd', fontSize: 11, marginTop: 7 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%', paddingBottom: 20, paddingHorizontal: 20, paddingTop: 15 },
  sheetHeader: { alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 14 },
  sheetTitle: { color: '#151515', flex: 1, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  sheetClose: { color: '#555', fontSize: 25, lineHeight: 28, textAlign: 'right', width: 30 },
  sheetNote: { color: '#777', fontSize: 12, lineHeight: 17, paddingBottom: 8, paddingTop: 13 },
  choiceRow: { borderBottomColor: '#eee', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, position: 'relative' },
  choiceTitle: { color: '#222', fontSize: 14, fontWeight: '800' },
  choiceHint: { color: '#8b8b8b', fontSize: 11, lineHeight: 16, marginTop: 4, paddingRight: 26 },
  selectedMark: { color: '#fe2c55', fontSize: 18, fontWeight: '900', position: 'absolute', right: 3, top: 18 },
  disabledChoice: { backgroundColor: '#f5f5f5', borderRadius: 10, marginTop: 10, padding: 14 },
  optionRow: { alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, paddingVertical: 14 },
  optionCopy: { flex: 1 },
});
