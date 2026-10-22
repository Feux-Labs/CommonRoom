import { useState, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { TopBar } from '../components/TopBar';
import { useAppTheme } from '../theme/ThemeContext';
import { AppColors, radius } from '../theme/tokens';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Heart,
  Image as ImageIcon,
  ListFilter,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Star,
  Trash,
  Users,
  X,
  Zap,
} from 'lucide-react-native/icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MeetScreenProps = {
  onMenuPress: () => void;
  currentUserProfile?: {
    displayName?: string;
    school?: string | null;
    avatarUrl?: string | null;
    course?: string;
    year?: string;
    interests?: string[];
  } | null;
  onUpdateProfile?: (updated: { avatarUrl?: string | null; displayName?: string; school?: string }) => void;
  onLogin?: (profile: any) => void;
  onOpenMessages?: (userId: string, userName: string) => void;
};

type ConnectProfile = {
  id: string;
  name: string;
  age: number;
  school: string;
  course: string;
  year: string;
  distance: string;
  bio: string;
  photos: string[];
  prompts: { q: string; a: string }[];
  interests: string[];
  vibe: string;
  online: boolean;
  avatarColor: string;
};

const initialProfiles: ConnectProfile[] = [
  {
    id: 'meet-1',
    name: 'Aisha Bello',
    age: 20,
    school: 'University of Lagos (UNILAG)',
    course: 'Computer Science',
    year: '300 Level',
    distance: '0.4 km away',
    bio: 'Tech enthusiast, late-night hackathons, and finding the best jollof spot around campus.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    ],
    prompts: [
      { q: 'My typical campus weekend', a: 'Building side projects or chilling by the lagoon front.' },
      { q: 'The way to win me over', a: 'Send good music playlists and iced matcha lattes.' },
    ],
    interests: ['Coding', 'Design', 'Afrobeats', 'Podcasts', 'Matcha'],
    vibe: 'Tech & Chill',
    online: true,
    avatarColor: '#6366f1',
  },
  {
    id: 'meet-2',
    name: 'Tobi Adebayo',
    age: 22,
    school: 'Bells University of Technology',
    course: 'Architecture',
    year: '400 Level',
    distance: '1.2 km away',
    bio: 'Sketching building concepts, weekend basketball, and debating sci-fi movie endings.',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    ],
    prompts: [
      { q: 'Favorite spot on campus', a: 'The rooftop studio at sunset.' },
      { q: 'Unpopular campus opinion', a: '8 AM lectures build true character.' },
    ],
    interests: ['Architecture', 'Basketball', 'Film', 'Photography', 'Coffee'],
    vibe: 'Creative & Sporty',
    online: true,
    avatarColor: '#ec4899',
  },
  {
    id: 'meet-3',
    name: 'Chioma Okeke',
    age: 21,
    school: 'Covenant University',
    course: 'Economics',
    year: '300 Level',
    distance: '2.5 km away',
    bio: 'Investment analysis by day, acoustic indie vibes by night. Always down for campus debates.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
    ],
    prompts: [
      { q: 'My biggest green flag', a: 'I return borrowed books in pristine condition.' },
    ],
    interests: ['Economics', 'Debate', 'Acoustic', 'Chess', 'Reading'],
    vibe: 'Ambitious & Mindful',
    online: false,
    avatarColor: '#10b981',
  },
  {
    id: 'meet-4',
    name: 'David Oladipo',
    age: 23,
    school: 'University of Ibadan (UI)',
    course: 'Mechanical Engineering',
    year: 'Final Year',
    distance: '3.1 km away',
    bio: 'Formula student builder, photography hobbyist, and connoisseur of campus street food.',
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    ],
    prompts: [
      { q: 'Best piece of college advice', a: 'Get your sleep cycle sorted before exam week.' },
    ],
    interests: ['Engineering', 'Cars', 'Photography', 'Gaming', 'Gym'],
    vibe: 'Builder & Explorer',
    online: true,
    avatarColor: '#f59e0b',
  },
];

export function MeetScreen({
  onMenuPress,
  currentUserProfile,
  onUpdateProfile,
  onLogin,
  onOpenMessages,
}: MeetScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeTab, setActiveTab] = useState<'discover' | 'connections'>('discover');
  const [profiles, setProfiles] = useState<ConnectProfile[]>(initialProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [connections, setConnections] = useState<ConnectProfile[]>([
    initialProfiles[0], // Aisha Bello connected as sample mutual connection
  ]);
  const [matchedProfile, setMatchedProfile] = useState<ConnectProfile | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // ──── Flow State: Opt-In & Onboarding ───────────────────────────────────────
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [showOptInPrompt, setShowOptInPrompt] = useState(true);
  const [showMiniAuth, setShowMiniAuth] = useState(false);
  const [miniAuthMode, setMiniAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSchool, setAuthSchool] = useState('');

  // ──── Photo Setup State (1 + up to 5 more, minimum 2 required) ──────────────
  const [showPhotoSetup, setShowPhotoSetup] = useState(false);
  const [photo1, setPhoto1] = useState<string | null>(currentUserProfile?.avatarUrl ?? null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [askUseAsProfilePic, setAskUseAsProfilePic] = useState(false);
  const [pendingAvatarCandidate, setPendingAvatarCandidate] = useState<string | null>(null);
  const [connectBio, setConnectBio] = useState('');
  const [connectInterests, setConnectInterests] = useState<string[]>(['Campus Life', 'Tech', 'Music']);

  const currentProfile = profiles[currentIndex] ?? null;
  const currentPhotos = currentProfile?.photos ?? [];

  // Reset photo index when card changes
  const handleNextCard = () => {
    setPhotoIndex(0);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleConnectLike = (profile: ConnectProfile) => {
    if (!connections.some((c) => c.id === profile.id)) {
      setConnections((prev) => [profile, ...prev]);
    }
    setMatchedProfile(profile);
    handleNextCard();
  };

  const handlePass = () => {
    handleNextCard();
  };

  // ──── Image Pickers ────────────────────────────────────────────────────────
  const pickPhoto1 = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setPhoto1(uri);

        // If user has no app profile photo, ask if they want to use it as main profile photo too!
        if (!currentUserProfile?.avatarUrl) {
          setPendingAvatarCandidate(uri);
          setAskUseAsProfilePic(true);
        }
      }
    } catch {
      // Mock fallback sample image for web or permissions
      const sample = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
      setPhoto1(sample);
      if (!currentUserProfile?.avatarUrl) {
        setPendingAvatarCandidate(sample);
        setAskUseAsProfilePic(true);
      }
    }
  };

  const pickAdditionalPhoto = async () => {
    if (additionalPhotos.length >= 5) {
      Alert.alert('Maximum Reached', 'You can upload up to 5 additional photos.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAdditionalPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch {
      const samples = [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      ];
      const next = samples[additionalPhotos.length % samples.length];
      setAdditionalPhotos((prev) => [...prev, next]);
    }
  };

  const removeAdditionalPhoto = (idx: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ──── Flow Actions ─────────────────────────────────────────────────────────
  const handleOptInStart = () => {
    setShowOptInPrompt(false);
    // If not logged in, take them through mini sign-up flow
    if (!currentUserProfile || !currentUserProfile.displayName) {
      setShowMiniAuth(true);
    } else {
      setShowPhotoSetup(true);
    }
  };

  const handleMiniAuthSubmit = () => {
    if (miniAuthMode === 'signup' && !authName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    const newProfile = {
      displayName: authName.trim() || 'Student',
      school: authSchool.trim() || 'University of Lagos',
      avatarUrl: null,
      course: 'Undergraduate',
      year: 'Year 2',
      interests: ['Campus life', 'Technology'],
    };
    onLogin?.(newProfile);
    setShowMiniAuth(false);
    setShowPhotoSetup(true);
  };

  const handleConfirmProfilePicDecision = (useAsMain: boolean) => {
    if (useAsMain && pendingAvatarCandidate) {
      onUpdateProfile?.({ avatarUrl: pendingAvatarCandidate });
    }
    setAskUseAsProfilePic(false);
    setPendingAvatarCandidate(null);
  };

  const handleFinishPhotoSetup = () => {
    const totalPhotos = (photo1 ? 1 : 0) + additionalPhotos.length;
    if (totalPhotos < 2) {
      Alert.alert(
        'At least 2 photos required',
        'Please upload Photo 1 and at least 1 more photo so other students can recognize your profile.'
      );
      return;
    }
    setIsOptedIn(true);
    setShowPhotoSetup(false);
    Alert.alert('Connect profile active', 'Your profile is now visible to other students.');
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Connect" onMenuPress={onMenuPress} />

      {/* Top Segment Control */}
      <View style={styles.topBarSegment}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('discover')}
          style={[styles.segmentBtn, activeTab === 'discover' && styles.segmentBtnActive]}
        >
          <Users size={14} color={activeTab === 'discover' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.segmentText, activeTab === 'discover' && styles.segmentTextActive]}>
            Discover
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('connections')}
          style={[styles.segmentBtn, activeTab === 'connections' && styles.segmentBtnActive]}
        >
          <Users size={14} color={activeTab === 'connections' ? '#000000' : '#8e95a5'} />
          <Text style={[styles.segmentText, activeTab === 'connections' && styles.segmentTextActive]}>
            Connections {connections.length > 0 ? `(${connections.length})` : ''}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Filter preferences"
          accessibilityRole="button"
          onPress={() => setFilterModalOpen(true)}
          style={styles.filterBtn}
        >
          <ListFilter size={15} color={colors.text} />
        </Pressable>
      </View>

      {/* ──── DISCOVER TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'discover' ? (
        <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {currentProfile ? (
            <View style={styles.cardContainer}>
              <View style={styles.profileCard}>
                {/* Photo Gallery Carousel */}
                <View style={styles.carouselContainer}>
                  {currentPhotos.length > 0 ? (
                    <Image
                      source={{ uri: currentPhotos[photoIndex] || currentPhotos[0] }}
                      style={styles.carouselImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.cardBanner, { backgroundColor: currentProfile.avatarColor }]}>
                      <Text style={styles.avatarInitial}>{currentProfile.name.charAt(0)}</Text>
                    </View>
                  )}

                  {/* Photo Indicators / Dots */}
                  {currentPhotos.length > 1 ? (
                    <View style={styles.photoDotsRow}>
                      {currentPhotos.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.photoDot, i === photoIndex && styles.photoDotActive]}
                        />
                      ))}
                    </View>
                  ) : null}

                  {/* Tap Left / Right to cycle photos */}
                  {currentPhotos.length > 1 ? (
                    <View style={styles.tapAreasOverlay} pointerEvents="box-none">
                      <Pressable
                        style={styles.tapLeft}
                        onPress={() => setPhotoIndex((p) => Math.max(0, p - 1))}
                      />
                      <Pressable
                        style={styles.tapRight}
                        onPress={() => setPhotoIndex((p) => Math.min(currentPhotos.length - 1, p + 1))}
                      />
                    </View>
                  ) : null}

                  {/* Vibe Badge */}
                  <View style={styles.bannerBadge}>
                    <Zap size={12} color="#ffffff" />
                    <Text style={styles.bannerBadgeText}>{currentProfile.vibe}</Text>
                  </View>

                  {/* Photo counter */}
                  {currentPhotos.length > 1 ? (
                    <View style={styles.photoCounterBadge}>
                      <Text style={styles.photoCounterText}>
                        {photoIndex + 1}/{currentPhotos.length}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Identity info */}
                <View style={styles.cardBody}>
                  <View style={styles.identityRow}>
                    <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                    <CircleCheck size={16} color="#3b82f6" />
                  </View>
                  <Text style={styles.schoolInfo}>
                    {currentProfile.course} · {currentProfile.year}
                  </Text>
                  <View style={styles.distanceRow}>
                    <MapPin size={13} color="#8e95a5" />
                    <Text style={styles.distanceText}>{currentProfile.school} ({currentProfile.distance})</Text>
                  </View>

                  <Text style={styles.bio}>{currentProfile.bio}</Text>

                  {/* Interests */}
                  <View style={styles.tagsWrap}>
                    {currentProfile.interests.map((interest) => (
                      <View key={interest} style={styles.tagPill}>
                        <Text style={styles.tagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Prompts */}
                  {currentProfile.prompts.map((p, idx) => (
                    <View key={idx} style={styles.promptCard}>
                      <Text style={styles.promptQuestion}>{p.q}</Text>
                      <Text style={styles.promptAnswer}>{p.a}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsBar}>
                  <Pressable accessibilityRole="button" onPress={handlePass} style={styles.passBtn}>
                    <X size={26} color="#ef4444" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleConnectLike(currentProfile)}
                    style={styles.connectLikeBtn}
                  >
                    <Heart size={30} color="#ffffff" fill="#ffffff" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleConnectLike(currentProfile)}
                    style={styles.superLikeBtn}
                  >
                    <Star size={24} color="#f59e0b" fill="#f59e0b" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#6366f1" />
              <Text style={styles.emptyTitle}>You’re All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                You’ve seen everyone nearby. Check your Connections tab to chat with people who are also interested.
              </Text>
              <Pressable onPress={() => setCurrentIndex(0)} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Start Over</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ──── CONNECTIONS TAB (MUTUAL MATCHES ONLY) ────────────────────────── */}
      {activeTab === 'connections' ? (
        <ScrollView contentContainerStyle={styles.connectionsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.connectionsHeader}>
            <Text style={styles.connectionsHeading}>Connections</Text>
            <Text style={styles.connectionsSubheading}>
              You can chat with students who are also interested. Your privacy is protected.
            </Text>
          </View>

          {connections.length > 0 ? (
            connections.map((item) => (
              <View key={item.id} style={styles.connectionItem}>
                {item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.connectionAvatar} />
                ) : (
                  <View style={[styles.connectionAvatar, { backgroundColor: item.avatarColor }]}>
                    <Text style={styles.connectionAvatarInitial}>{item.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.connectionInfo}>
                  <View style={styles.connectionNameRow}>
                    <Text style={styles.connectionName}>{item.name}, {item.age}</Text>
                    <CircleCheck size={14} color="#3b82f6" />
                  </View>
                  <Text style={styles.connectionSchool}>{item.course} · {item.school}</Text>
                  <Text style={styles.connectionVibe}>{item.vibe}</Text>
                </View>

                {/* Direct 1-Click Chat Button */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onOpenMessages?.(item.id, item.name)}
                  style={styles.chatButton}
                >
                  <MessageCircle size={15} color="#000000" />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#8e95a5" />
              <Text style={styles.emptyTitle}>No Connections Yet</Text>
              <Text style={styles.emptySubtitle}>
                When you and another student show mutual interest, they’ll appear here so you can say hello.
              </Text>
              <Pressable onPress={() => setActiveTab('discover')} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Explore Students</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ──── MODAL 1: OPT-IN PROMPT (WHEN USER OPENS CONNECT) ─────────────── */}
      <Modal animationType="fade" transparent visible={showOptInPrompt && !isOptedIn}>
        <View style={styles.modalOverlay}>
          <View style={styles.optInCard}>
            <View style={styles.optInIconWrap}>
              <Users size={28} color="#6366f1" />
            </View>
            <Text style={styles.optInTitle}>Join Connect</Text>
            <Text style={styles.optInSubtitle}>
              Would you like to make your profile visible to other students on campus?
            </Text>
            <View style={styles.optInBenefits}>
              <View style={styles.benefitRow}>
                <Check size={16} color="#10b981" />
                <Text style={styles.benefitText}>Only students you mutually like can message you</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#10b981" />
                <Text style={styles.benefitText}>Showcase 2 to 6 photos with your course & campus vibe</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#10b981" />
                <Text style={styles.benefitText}>Control your visibility or hide your profile anytime</Text>
              </View>
            </View>

            <Pressable onPress={handleOptInStart} style={styles.optInPrimaryBtn}>
              <Text style={styles.optInPrimaryText}>Set Up My Connect Profile</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowOptInPrompt(false);
                setIsOptedIn(true);
              }}
              style={styles.optInSecondaryBtn}
            >
              <Text style={styles.optInSecondaryText}>Browse Privately for Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ──── MODAL 2: MINI AUTH MODAL (TRANSPARENT FROSTED SIGN-UP) ───────── */}
      <Modal animationType="slide" transparent visible={showMiniAuth}>
        <View style={styles.modalOverlay}>
          <View style={styles.miniAuthCard}>
            <View style={styles.miniAuthHeader}>
              <Text style={styles.miniAuthTitle}>
                {miniAuthMode === 'signup' ? 'Create Your Student Profile' : 'Sign In'}
              </Text>
              <Pressable onPress={() => setShowMiniAuth(false)}>
                <X color={colors.text} size={18} />
              </Pressable>
            </View>
            <Text style={styles.miniAuthSubtitle}>
              These details will be used across Commonroom for your account.
            </Text>

            {miniAuthMode === 'signup' ? (
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#8e95a5"
                style={styles.inputField}
                value={authName}
                onChangeText={setAuthName}
              />
            ) : null}

            <TextInput
              placeholder="Campus Email Address"
              placeholderTextColor="#8e95a5"
              keyboardType="email-address"
              style={styles.inputField}
              value={authEmail}
              onChangeText={setAuthEmail}
            />

            <TextInput
              placeholder="Password (min 8 characters)"
              placeholderTextColor="#8e95a5"
              secureTextEntry
              style={styles.inputField}
              value={authPassword}
              onChangeText={setAuthPassword}
            />

            {miniAuthMode === 'signup' ? (
              <TextInput
                placeholder="University / Campus (e.g. UNILAG, Covenant)"
                placeholderTextColor="#8e95a5"
                style={styles.inputField}
                value={authSchool}
                onChangeText={setAuthSchool}
              />
            ) : null}

            <Pressable onPress={handleMiniAuthSubmit} style={styles.optInPrimaryBtn}>
              <Text style={styles.optInPrimaryText}>
                {miniAuthMode === 'signup' ? 'Create Account & Continue' : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMiniAuthMode((m) => (m === 'signup' ? 'signin' : 'signup'))}
              style={styles.toggleAuthBtn}
            >
              <Text style={styles.toggleAuthText}>
                {miniAuthMode === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ──── MODAL 3: MULTI-PHOTO ONBOARDING SETUP ──────────────────────────── */}
      <Modal animationType="slide" transparent visible={showPhotoSetup}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.photoSetupScroll}>
            <View style={styles.photoSetupCard}>
              <View style={styles.miniAuthHeader}>
                <Text style={styles.miniAuthTitle}>Set Up Connect Photos</Text>
                <Pressable onPress={() => setShowPhotoSetup(false)}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>
              <Text style={styles.photoSetupSubtitle}>
                Upload Photo 1 and at least 1 more (minimum 2 photos required, up to 6 total).
              </Text>

              {/* Slot 1: Primary Photo */}
              <Text style={styles.slotLabel}>Photo 1 (Primary Photo *Required)</Text>
              <View style={styles.primaryPhotoSlot}>
                {photo1 ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photo1 }} style={styles.primaryPhotoPreview} />
                    <Pressable onPress={pickPhoto1} style={styles.changePhotoBadge}>
                      <Camera size={14} color="#ffffff" />
                      <Text style={styles.changePhotoText}>Change</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={pickPhoto1} style={styles.emptyPrimaryPhoto}>
                    <Camera size={28} color="#6366f1" />
                    <Text style={styles.emptyPhotoText}>Tap to add Photo 1</Text>
                  </Pressable>
                )}
              </View>

              {/* Slots 2-6: Additional Photos Grid */}
              <Text style={styles.slotLabel}>Additional Photos ({additionalPhotos.length}/5)</Text>
              <View style={styles.additionalGrid}>
                {additionalPhotos.map((uri, idx) => (
                  <View key={idx} style={styles.gridThumbWrap}>
                    <Image source={{ uri }} style={styles.gridThumb} />
                    <Pressable
                      onPress={() => removeAdditionalPhoto(idx)}
                      style={styles.removePhotoBadge}
                    >
                      <Trash size={12} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
                {additionalPhotos.length < 5 ? (
                  <Pressable onPress={pickAdditionalPhoto} style={styles.addThumbSlot}>
                    <Plus size={22} color="#8e95a5" />
                    <Text style={styles.addThumbText}>Add Photo</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Bio & Vibe Input */}
              <Text style={styles.slotLabel}>Short Bio</Text>
              <TextInput
                maxLength={200}
                multiline
                placeholder="Share your interests, weekend spots, or favorite course…"
                placeholderTextColor="#8e95a5"
                style={styles.bioInputField}
                value={connectBio}
                onChangeText={setConnectBio}
              />

              {/* Complete Setup */}
              <Pressable
                onPress={handleFinishPhotoSetup}
                style={[
                  styles.optInPrimaryBtn,
                  ((photo1 ? 1 : 0) + additionalPhotos.length < 2) && styles.disabledBtn,
                ]}
              >
                <Text style={styles.optInPrimaryText}>
                  Finish & Activate ({((photo1 ? 1 : 0) + additionalPhotos.length)}/2 min photos)
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ──── MODAL 4: ASK USE AS MAIN PROFILE PICTURE ──────────────────────── */}
      <Modal animationType="fade" transparent visible={askUseAsProfilePic}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmPicCard}>
            <View style={styles.confirmPicHeader}>
              <ImageIcon size={24} color="#6366f1" />
              <Text style={styles.confirmPicTitle}>Use as Main Profile Photo?</Text>
            </View>
            <Text style={styles.confirmPicText}>
              You don’t have a profile photo on Commonroom yet. Would you like to use this photo as your main profile picture across the whole app too?
            </Text>
            <View style={styles.confirmPicActions}>
              <Pressable
                onPress={() => handleConfirmProfilePicDecision(true)}
                style={styles.confirmYesBtn}
              >
                <Text style={styles.confirmYesText}>Yes, use as main profile</Text>
              </Pressable>
              <Pressable
                onPress={() => handleConfirmProfilePicDecision(false)}
                style={styles.confirmNoBtn}
              >
                <Text style={styles.confirmNoText}>No, keep it private</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ──── MODAL 5: MUTUAL MATCH / CONNECTION MODAL ──────────────────────── */}
      <Modal animationType="slide" transparent visible={matchedProfile !== null}>
        <View style={styles.matchModalOverlay}>
          <View style={styles.matchCard}>
            <Heart size={36} color="#f59e0b" />
            <Text style={styles.matchHeading}>Mutual interest!</Text>
            <Text style={styles.matchSubheading}>
              You and {matchedProfile?.name} are both interested. You can now say hello!
            </Text>

            <View style={styles.matchAvatarsRow}>
              <View style={[styles.matchAvatar, { backgroundColor: '#6366f1' }]}>
                <Text style={styles.matchAvatarText}>You</Text>
              </View>
              <View style={[styles.matchAvatar, { backgroundColor: matchedProfile?.avatarColor || '#ec4899' }]}>
                <Text style={styles.matchAvatarText}>{matchedProfile?.name.charAt(0)}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                const target = matchedProfile;
                setMatchedProfile(null);
                if (target) onOpenMessages?.(target.id, target.name);
              }}
              style={styles.matchChatBtn}
            >
              <MessageCircle size={18} color="#000000" />
              <Text style={styles.matchChatBtnText}>Chat With {matchedProfile?.name}</Text>
            </Pressable>

            <Pressable onPress={() => setMatchedProfile(null)} style={styles.matchKeepBrowsingBtn}>
              <Text style={styles.matchKeepBrowsingText}>Keep Exploring</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    topBarSegment: {
      alignItems: 'center',
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    segmentBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: radius.pill,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    segmentBtnActive: {
      backgroundColor: '#ffffff',
    },
    segmentText: {
      color: '#8e95a5',
      fontSize: 12,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: '#000000',
      fontWeight: '700',
    },
    filterBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: radius.pill,
      height: 32,
      justifyContent: 'center',
      marginLeft: 'auto',
      width: 32,
    },
    contentScroll: {
      paddingBottom: 40,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    cardContainer: {
      alignItems: 'center',
      width: '100%',
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      width: '100%',
    },
    carouselContainer: {
      height: 360,
      position: 'relative',
      width: '100%',
    },
    carouselImage: {
      backgroundColor: '#1a1f2c',
      height: '100%',
      width: '100%',
    },
    cardBanner: {
      alignItems: 'center',
      height: '100%',
      justifyContent: 'center',
      width: '100%',
    },
    avatarInitial: {
      color: '#ffffff',
      fontSize: 80,
      fontWeight: '900',
    },
    photoDotsRow: {
      bottom: 12,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
    },
    photoDot: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    photoDotActive: {
      backgroundColor: '#ffffff',
      width: 18,
    },
    tapAreasOverlay: {
      bottom: 0,
      flexDirection: 'row',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    tapLeft: {
      flex: 1,
      height: '100%',
    },
    tapRight: {
      flex: 1,
      height: '100%',
    },
    bannerBadge: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderRadius: radius.pill,
      flexDirection: 'row',
      gap: 4,
      left: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      position: 'absolute',
      top: 14,
    },
    bannerBadgeText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
    },
    photoCounterBadge: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 4,
      position: 'absolute',
      right: 14,
      top: 14,
    },
    photoCounterText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    cardBody: {
      padding: 16,
    },
    identityRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    name: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    schoolInfo: {
      color: '#8e95a5',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    distanceRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
      marginTop: 6,
    },
    distanceText: {
      color: '#8e95a5',
      fontSize: 12,
    },
    bio: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 10,
    },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    tagPill: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    tagText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '600',
    },
    promptCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      borderRadius: radius.md,
      borderWidth: 1,
      marginTop: 10,
      padding: 12,
    },
    promptQuestion: {
      color: '#8e95a5',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    promptAnswer: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
    },
    actionsBar: {
      alignItems: 'center',
      borderTopColor: 'rgba(255, 255, 255, 0.06)',
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      paddingVertical: 14,
    },
    passBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderRadius: 30,
      borderWidth: 1,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    connectLikeBtn: {
      alignItems: 'center',
      backgroundColor: '#ec4899',
      borderRadius: 36,
      height: 68,
      justifyContent: 'center',
      shadowColor: '#ec4899',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      width: 68,
    },
    superLikeBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      borderRadius: 30,
      borderWidth: 1,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 14,
    },
    emptySubtitle: {
      color: '#8e95a5',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
      textAlign: 'center',
    },
    resetBtn: {
      backgroundColor: '#ffffff',
      borderRadius: radius.pill,
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    resetBtnText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '700',
    },
    connectionsScroll: {
      paddingBottom: 40,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    connectionsHeader: {
      marginBottom: 16,
    },
    connectionsHeading: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    connectionsSubheading: {
      color: '#8e95a5',
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    connectionItem: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 10,
      padding: 12,
    },
    connectionAvatar: {
      alignItems: 'center',
      borderRadius: 24,
      height: 48,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 48,
    },
    connectionAvatarInitial: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '800',
    },
    connectionInfo: {
      flex: 1,
      marginLeft: 12,
    },
    connectionNameRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    connectionName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    connectionSchool: {
      color: '#8e95a5',
      fontSize: 12,
      marginTop: 2,
    },
    connectionVibe: {
      color: '#818cf8',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    chatButton: {
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: radius.pill,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chatButtonText: {
      color: '#000000',
      fontSize: 12,
      fontWeight: '700',
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    optInCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 24,
      borderWidth: 1,
      maxWidth: 380,
      padding: 24,
      width: '100%',
    },
    optInIconWrap: {
      alignItems: 'center',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      marginBottom: 14,
      width: 56,
    },
    optInTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
    optInSubtitle: {
      color: '#8e95a5',
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
      textAlign: 'center',
    },
    optInBenefits: {
      gap: 10,
      marginVertical: 18,
      width: '100%',
    },
    benefitRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    benefitText: {
      color: colors.text,
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
    },
    optInPrimaryBtn: {
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: radius.pill,
      paddingVertical: 12,
      width: '100%',
    },
    optInPrimaryText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
    optInSecondaryBtn: {
      alignItems: 'center',
      marginTop: 10,
      paddingVertical: 8,
    },
    optInSecondaryText: {
      color: '#8e95a5',
      fontSize: 12,
      fontWeight: '600',
    },
    miniAuthCard: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 24,
      borderWidth: 1,
      maxWidth: 380,
      padding: 20,
      width: '100%',
    },
    miniAuthHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    miniAuthTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    miniAuthSubtitle: {
      color: '#8e95a5',
      fontSize: 12,
      marginBottom: 16,
      marginTop: 4,
    },
    inputField: {
      backgroundColor: colors.background,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: radius.md,
      borderWidth: 1,
      color: colors.text,
      fontSize: 13,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    toggleAuthBtn: {
      alignItems: 'center',
      marginTop: 12,
    },
    toggleAuthText: {
      color: '#8e95a5',
      fontSize: 12,
    },
    photoSetupScroll: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: 16,
    },
    photoSetupCard: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 24,
      borderWidth: 1,
      maxWidth: 420,
      padding: 20,
      width: '100%',
    },
    photoSetupSubtitle: {
      color: '#8e95a5',
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 16,
      marginTop: 4,
    },
    slotLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 10,
    },
    primaryPhotoSlot: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      width: '100%',
    },
    photoPreviewWrap: {
      height: 180,
      position: 'relative',
      width: '100%',
    },
    primaryPhotoPreview: {
      borderRadius: radius.md,
      height: '100%',
      width: '100%',
    },
    changePhotoBadge: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderRadius: radius.pill,
      bottom: 10,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      position: 'absolute',
      right: 10,
    },
    changePhotoText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '600',
    },
    emptyPrimaryPhoto: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderRadius: radius.md,
      borderStyle: 'dashed',
      borderWidth: 1.5,
      height: 130,
      justifyContent: 'center',
      width: '100%',
    },
    emptyPhotoText: {
      color: '#6366f1',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
    },
    additionalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    gridThumbWrap: {
      height: 80,
      position: 'relative',
      width: '30%',
    },
    gridThumb: {
      borderRadius: radius.md,
      height: '100%',
      width: '100%',
    },
    removePhotoBadge: {
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.85)',
      borderRadius: 12,
      height: 20,
      justifyContent: 'center',
      position: 'absolute',
      right: 4,
      top: 4,
      width: 20,
    },
    addThumbSlot: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: radius.md,
      borderStyle: 'dashed',
      borderWidth: 1,
      height: 80,
      justifyContent: 'center',
      width: '30%',
    },
    addThumbText: {
      color: '#8e95a5',
      fontSize: 10,
      marginTop: 4,
    },
    bioInputField: {
      backgroundColor: colors.background,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: radius.md,
      borderWidth: 1,
      color: colors.text,
      fontSize: 13,
      marginBottom: 14,
      minHeight: 70,
      padding: 10,
      textAlignVertical: 'top',
    },
    disabledBtn: {
      opacity: 0.5,
    },
    confirmPicCard: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 24,
      borderWidth: 1,
      maxWidth: 360,
      padding: 20,
      width: '100%',
    },
    confirmPicHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    confirmPicTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    confirmPicText: {
      color: '#8e95a5',
      fontSize: 13,
      lineHeight: 18,
    },
    confirmPicActions: {
      gap: 8,
      marginTop: 18,
    },
    confirmYesBtn: {
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: radius.pill,
      paddingVertical: 10,
    },
    confirmYesText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '700',
    },
    confirmNoBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: radius.pill,
      paddingVertical: 10,
    },
    confirmNoText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    matchModalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    matchCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 28,
      borderWidth: 1,
      maxWidth: 360,
      padding: 24,
      width: '100%',
    },
    matchHeading: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      marginTop: 12,
    },
    matchSubheading: {
      color: '#8e95a5',
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
      textAlign: 'center',
    },
    matchAvatarsRow: {
      flexDirection: 'row',
      gap: 16,
      marginVertical: 20,
    },
    matchAvatar: {
      alignItems: 'center',
      borderRadius: 40,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    matchAvatarText: {
      color: '#ffffff',
      fontSize: 22,
      fontWeight: '800',
    },
    matchChatBtn: {
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: radius.pill,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      paddingVertical: 12,
      width: '100%',
    },
    matchChatBtnText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
    matchKeepBrowsingBtn: {
      marginTop: 12,
      paddingVertical: 8,
    },
    matchKeepBrowsingText: {
      color: '#8e95a5',
      fontSize: 13,
      fontWeight: '600',
    },
  });
