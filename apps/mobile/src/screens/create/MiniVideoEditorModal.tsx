import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppColors, radius } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MediaItem = {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
};

export type SoundTrack = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  category: 'trending' | 'lofi' | 'energy' | 'chill';
};

const presetTracks: SoundTrack[] = [
  { id: 's1', title: 'Campus Chill Lofi', artist: 'Commonroom Beats', duration: '0:35', category: 'lofi' },
  { id: 's2', title: 'Afro Campus Groove', artist: 'Lagos Sound', duration: '0:30', category: 'trending' },
  { id: 's3', title: 'High Energy Drill', artist: 'Beat Squad', duration: '0:25', category: 'energy' },
  { id: 's4', title: 'Morning Study Walk', artist: 'Acoustic Vibe', duration: '0:40', category: 'chill' },
];

export type AutoCutTemplate = {
  id: 'campus_energy' | 'chill_lofi' | 'fast_beats' | 'cinematic';
  title: string;
  durationPerPhoto: number; // in seconds
  transition: 'zoom' | 'fade' | 'cut' | 'slide';
  soundId: string;
};

const templates: AutoCutTemplate[] = [
  { id: 'campus_energy', title: 'Campus Energy', durationPerPhoto: 1.2, transition: 'zoom', soundId: 's3' },
  { id: 'chill_lofi', title: 'Chill Lofi', durationPerPhoto: 2.5, transition: 'fade', soundId: 's1' },
  { id: 'fast_beats', title: 'TikTok Speed Cuts', durationPerPhoto: 0.8, transition: 'cut', soundId: 's2' },
  { id: 'cinematic', title: 'Cinematic Slow', durationPerPhoto: 3.0, transition: 'slide', soundId: 's4' },
];

type MiniVideoEditorModalProps = {
  visible: boolean;
  mediaList: MediaItem[];
  onClose: () => void;
  onApplyReel: (reelTitle: string, selectedTrack: SoundTrack) => void;
};

export function MiniVideoEditorModal({
  visible,
  mediaList,
  onClose,
  onApplyReel,
}: MiniVideoEditorModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'sound'>('auto');
  const [selectedTemplate, setSelectedTemplate] = useState<AutoCutTemplate>(templates[0]);
  const [selectedTrack, setSelectedTrack] = useState<SoundTrack>(presetTracks[0]);
  const [orderedMedia, setOrderedMedia] = useState<MediaItem[]>(mediaList);

  // Playback simulation
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [customDuration, setCustomDuration] = useState(selectedTemplate.durationPerPhoto);
  const [isMuted, setIsMuted] = useState(false);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);

  useEffect(() => {
    setOrderedMedia(mediaList);
  }, [mediaList]);

  // Slide loop timer
  useEffect(() => {
    if (!visible || !isPlaying || orderedMedia.length === 0) return;

    const intervalMs = Math.max(800, customDuration * 1000);
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % orderedMedia.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [visible, isPlaying, orderedMedia.length, customDuration]);

  const handleSelectTemplate = (tpl: AutoCutTemplate) => {
    setSelectedTemplate(tpl);
    setCustomDuration(tpl.durationPerPhoto);
    const matchedTrack = presetTracks.find((t) => t.id === tpl.soundId);
    if (matchedTrack) setSelectedTrack(matchedTrack);
    setCurrentSlideIndex(0);
  };

  const moveSlide = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= orderedMedia.length) return;
    const copy = [...orderedMedia];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setOrderedMedia(copy);
  };

  const handleUploadCustomSound = () => {
    const custom: SoundTrack = {
      id: `custom-track-${Date.now()}`,
      title: 'My Uploaded Track',
      artist: 'Custom Sound',
      duration: '0:30',
      category: 'trending',
    };
    setSelectedTrack(custom);
    setCustomSoundName('My Uploaded Track (Local audio attached)');
  };

  const handleFinish = () => {
    onApplyReel(
      `Reel (${selectedTemplate.title} · ${selectedTrack.title})`,
      selectedTrack
    );
    onClose();
  };

  const currentItem = orderedMedia[currentSlideIndex] ?? orderedMedia[0];

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconBtn}>
            <X size={20} color="#ffffff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Auto-Cut & Reel Studio</Text>
            <Text style={styles.headerSubtitle}>
              {orderedMedia.length} clips · {selectedTrack.title}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleFinish} style={styles.exportPill}>
            <Check size={14} color="#000000" strokeWidth={3} />
            <Text style={styles.exportPillText}>Use Reel</Text>
          </Pressable>
        </View>

        {/* Live Reel Preview Screen */}
        <View style={styles.previewContainer}>
          {currentItem ? (
            <View style={styles.previewFrame}>
              <Image
                contentFit="cover"
                source={{ uri: currentItem.uri }}
                style={styles.previewImage}
              />
              {/* Overlay Badges */}
              <View style={styles.previewOverlayTop}>
                <View style={styles.vibeBadge}>
                  <Zap size={11} color="#ffffff" />
                  <Text style={styles.vibeBadgeText}>{selectedTemplate.title}</Text>
                </View>
                <View style={styles.slideCounterBadge}>
                  <Text style={styles.slideCounterText}>
                    {currentSlideIndex + 1} / {orderedMedia.length}
                  </Text>
                </View>
              </View>

              {/* Music Ticker */}
              <View style={styles.previewMusicTicker}>
                <Music size={12} color="#ffffff" />
                <Text numberOfLines={1} style={styles.tickerText}>
                  {selectedTrack.title} · {selectedTrack.artist}
                </Text>
              </View>

              {/* Play/Pause control overlay */}
              <Pressable
                accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
                onPress={() => setIsPlaying((prev) => !prev)}
                style={styles.playbackOverlayBtn}
              >
                {isPlaying ? <Pause size={18} color="#ffffff" /> : <Play size={18} color="#ffffff" />}
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Film size={40} color="#8e95a5" />
              <Text style={styles.emptyPreviewText}>Add photos or videos to preview your reel</Text>
            </View>
          )}
        </View>

        {/* Tab Controls (Auto vs Manual vs Sound) */}
        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab('auto')}
            style={[styles.tabBtn, activeTab === 'auto' && styles.tabBtnActive]}
          >
            <Sparkles size={14} color={activeTab === 'auto' ? '#000000' : '#8e95a5'} />
            <Text style={[styles.tabBtnText, activeTab === 'auto' && styles.tabBtnTextActive]}>
              Auto-Cut
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab('manual')}
            style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
          >
            <Sliders size={14} color={activeTab === 'manual' ? '#000000' : '#8e95a5'} />
            <Text style={[styles.tabBtnText, activeTab === 'manual' && styles.tabBtnTextActive]}>
              Timeline & Trim
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab('sound')}
            style={[styles.tabBtn, activeTab === 'sound' && styles.tabBtnActive]}
          >
            <Music size={14} color={activeTab === 'sound' ? '#000000' : '#8e95a5'} />
            <Text style={[styles.tabBtnText, activeTab === 'sound' && styles.tabBtnTextActive]}>
              Sound ({selectedTrack.title.split(' ')[0]})
            </Text>
          </Pressable>
        </View>

        {/* Bottom Options Area */}
        <ScrollView contentContainerStyle={styles.bottomControls} showsVerticalScrollIndicator={false}>
          {activeTab === 'auto' ? (
            /* Auto-Cut Templates */
            <View>
              <Text style={styles.sectionHeading}>Choose a Reel Vibe (Auto-Cuts & Beats)</Text>
              <View style={styles.templateGrid}>
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <Pressable
                      key={tpl.id}
                      accessibilityRole="button"
                      onPress={() => handleSelectTemplate(tpl)}
                      style={[styles.templateCard, isSelected && styles.templateCardActive]}
                    >
                      <View style={styles.templateCardHeader}>
                        <Zap size={14} color={isSelected ? '#000000' : '#f59e0b'} />
                        <Text style={[styles.templateCardTitle, isSelected && styles.templateCardTitleActive]}>
                          {tpl.title}
                        </Text>
                      </View>
                      <Text style={[styles.templateCardDesc, isSelected && styles.templateCardDescActive]}>
                        {tpl.durationPerPhoto}s pacing · {tpl.transition} transitions
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {activeTab === 'manual' ? (
            /* Manual Timeline Editor */
            <View>
              <Text style={styles.sectionHeading}>Clip Sequence & Durations</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                {orderedMedia.map((item, idx) => (
                  <View key={item.id} style={styles.timelineThumbWrap}>
                    <Image source={{ uri: item.uri }} style={styles.timelineThumb} />
                    <Text style={styles.timelineIndex}>#{idx + 1}</Text>
                    <View style={styles.thumbActions}>
                      {idx > 0 ? (
                        <Pressable accessibilityLabel="Move left" onPress={() => moveSlide(idx, 'left')} style={styles.thumbMoveBtn}>
                          <ChevronLeft size={12} color="#ffffff" />
                        </Pressable>
                      ) : null}
                      {idx < orderedMedia.length - 1 ? (
                        <Pressable accessibilityLabel="Move right" onPress={() => moveSlide(idx, 'right')} style={styles.thumbMoveBtn}>
                          <ChevronRight size={12} color="#ffffff" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Duration Pacing Selector */}
              <View style={styles.durationSelectorWrap}>
                <Text style={styles.fieldLabel}>Seconds Per Photo/Clip:</Text>
                <View style={styles.durationPillsRow}>
                  {[0.8, 1.2, 1.8, 2.5, 3.5].map((sec) => (
                    <Pressable
                      key={sec}
                      accessibilityRole="button"
                      onPress={() => setCustomDuration(sec)}
                      style={[styles.durationPill, customDuration === sec && styles.durationPillActive]}
                    >
                      <Text style={[styles.durationPillText, customDuration === sec && styles.durationPillTextActive]}>
                        {sec}s
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === 'sound' ? (
            /* Sound System */
            <View>
              <View style={styles.soundHeaderRow}>
                <Text style={styles.sectionHeading}>Background Campus Sound</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsMuted((prev) => !prev)}
                  style={styles.muteBtn}
                >
                  {isMuted ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} color="#10b981" />}
                  <Text style={[styles.muteBtnText, isMuted && { color: '#ef4444' }]}>
                    {isMuted ? 'Muted' : 'Sound On'}
                  </Text>
                </Pressable>
              </View>

              {/* Upload custom sound row */}
              <Pressable
                accessibilityRole="button"
                onPress={handleUploadCustomSound}
                style={styles.uploadSoundRow}
              >
                <Upload size={16} color="#3b82f6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadSoundTitle}>Upload Your Own Audio</Text>
                  <Text style={styles.uploadSoundSub}>
                    {customSoundName || 'Attach custom MP3, voiceover, or WAV song'}
                  </Text>
                </View>
              </Pressable>

              {/* Preset tracks */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Preset Royalty-Free Campus Beats:</Text>
              {presetTracks.map((track) => {
                const isSelected = selectedTrack.id === track.id && !customSoundName;
                return (
                  <Pressable
                    key={track.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedTrack(track);
                      setCustomSoundName(null);
                    }}
                    style={[styles.trackRow, isSelected && styles.trackRowActive]}
                  >
                    <View style={[styles.trackDisc, isSelected && styles.trackDiscActive]}>
                      <Music size={14} color={isSelected ? '#000000' : '#8e95a5'} />
                    </View>
                    <View style={styles.trackDetails}>
                      <Text style={[styles.trackTitle, isSelected && styles.trackTitleActive]}>
                        {track.title}
                      </Text>
                      <Text style={styles.trackArtist}>{track.artist}</Text>
                    </View>
                    <Text style={styles.trackDuration}>{track.duration}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: '#0b0d11',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 2,
  },
  exportPill: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportPillText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  previewContainer: {
    alignItems: 'center',
    height: 300,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewFrame: {
    backgroundColor: '#12141a',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    width: 200,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewOverlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 8,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  vibeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vibeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  slideCounterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideCounterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  previewMusicTicker: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: radius.pill,
    bottom: 8,
    flexDirection: 'row',
    gap: 5,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 48,
  },
  tickerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  playbackOverlayBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    bottom: 8,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    width: 32,
  },
  emptyPreview: {
    alignItems: 'center',
    gap: 8,
  },
  emptyPreviewText: {
    color: '#8e95a5',
    fontSize: 12,
  },
  tabBar: {
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
  },
  tabBtnText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  bottomControls: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateCard: {
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  templateCardActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  templateCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  templateCardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  templateCardTitleActive: {
    color: '#000000',
  },
  templateCardDesc: {
    color: '#8e95a5',
    fontSize: 10,
    lineHeight: 14,
  },
  templateCardDescActive: {
    color: '#475569',
  },
  timelineScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineThumbWrap: {
    marginRight: 10,
    position: 'relative',
    width: 64,
  },
  timelineThumb: {
    backgroundColor: '#1b2234',
    borderRadius: 8,
    height: 80,
    width: 64,
  },
  timelineIndex: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    left: 4,
    paddingHorizontal: 4,
    position: 'absolute',
    top: 4,
  },
  thumbActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  thumbMoveBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  durationSelectorWrap: {
    marginTop: 8,
  },
  fieldLabel: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  durationPillActive: {
    backgroundColor: '#ffffff',
  },
  durationPillText: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '700',
  },
  durationPillTextActive: {
    color: '#000000',
  },
  soundHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  muteBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muteBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  uploadSoundRow: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  uploadSoundTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadSoundSub: {
    color: '#8e95a5',
    fontSize: 10,
    marginTop: 2,
  },
  trackRow: {
    alignItems: 'center',
    backgroundColor: '#131620',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  trackRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: '#ffffff',
  },
  trackDisc: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  trackDiscActive: {
    backgroundColor: '#ffffff',
  },
  trackDetails: {
    flex: 1,
    marginLeft: 10,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  trackTitleActive: {
    color: '#ffffff',
  },
  trackArtist: {
    color: '#8e95a5',
    fontSize: 11,
    marginTop: 1,
  },
  trackDuration: {
    color: '#8e95a5',
    fontSize: 11,
  },
});
