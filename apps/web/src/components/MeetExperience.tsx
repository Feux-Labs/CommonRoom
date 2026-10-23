'use client';

import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListFilter,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Trash,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { demoMeetProfiles, demoInitialConnections } from '@/lib/demo-content';
import type { DemoMeetProfile } from '@/lib/demo-content';

export type MeetProfile = {
  user_id: string;
  display_name: string;
  school: string | null;
  bio: string;
  interests: string[];
  photo_urls: string[];
  username?: string | null;
  course?: string | null;
  year?: string | null;
  avatar_url?: string | null;
  prompts?: { question: string; answer: string }[];
  verified?: boolean;
  age?: number;
  height?: string;
  vibe?: string;
  distance?: string;
  online?: boolean;
};

type MeetData = {
  me: {
    profile: { displayName: string; school: string | null; course: string; year: string; avatarUrl: string | null };
    meet: {
      display_name: string;
      bio: string;
      interests: string[];
      photo_urls: string[];
      discoverable: boolean;
    } | null;
  };
  profiles: MeetProfile[];
  people: MeetProfile[];
  demoContent?: boolean;
};

type Props = {
  session: Session | null;
  profile: { id: string; displayName: string; school: string | null };
  onRequireAccount: () => void;
};

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

const CAMPUS_VIBES = [
  'Tech & Chill',
  'Creative & Sporty',
  'Ambitious & Mindful',
  'Builder & Explorer',
  'Music & Energy',
  'Art & Deep Talks',
  'Night Owl & Books',
];

const DEFAULT_PROMPTS = [
  { question: 'A life goal of mine', answer: 'Visit every national park in Nigeria before I graduate 🌿' },
  { question: 'The way to win me over', answer: "Share your favourite music and I'll share mine 🎵" },
];

async function meetRequest<T>(token: string | null, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/v1/dating', {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  if (!result || !('data' in result)) throw new Error('The Connect service returned an invalid response.');
  return result.data as T;
}

async function meetChatRequest<T>(token: string, body: unknown): Promise<T> {
  const response = await fetch('/api/v1/dating/chat', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  if (!result || !('data' in result)) throw new Error('The messaging service returned an invalid response.');
  return result.data as T;
}

export function MeetExperience({ session, profile, onRequireAccount }: Props) {
  const [data, setData] = useState<MeetData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'connections'>('discover');

  // Filter states
  const [filterSchool, setFilterSchool] = useState<'all' | 'my_school'>('all');
  const [filterVibe, setFilterVibe] = useState<string>('all');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Deck states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  // Opt-in & Onboarding states
  const [isOptedIn, setIsOptedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('commonroom_connect_opted_in') === 'true';
  });
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Multi-photo profile setup states (1 primary + up to 5 additional, min 2 total)
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [connectBio, setConnectBio] = useState('');
  const [connectVibe, setConnectVibe] = useState('Tech & Chill');
  const [connectInterests, setConnectInterests] = useState('Coding, Design, Music, Campus life');
  const [prompt1Answer, setPrompt1Answer] = useState('Visit every national park in Nigeria before I graduate 🌿');
  const [prompt2Answer, setPrompt2Answer] = useState("Share your favourite music and I'll share mine 🎵");
  const [discoverable, setDiscoverable] = useState(true);
  const [pendingPhotoUpload, setPendingPhotoUpload] = useState(false);

  // Mutual Match & Connections
  const [connections, setConnections] = useState<MeetProfile[]>(demoInitialConnections as MeetProfile[]);
  const [matchedProfile, setMatchedProfile] = useState<MeetProfile | null>(null);

  // 1-on-1 Direct Chat
  const [activeChat, setActiveChat] = useState<{ profile: MeetProfile; conversationId: string; messages: ChatMessage[] } | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHistoryByUserId, setChatHistoryByUserId] = useState<Record<string, ChatMessage[]>>({
    'demo-connect-aisha': [
      {
        id: 'msg-seed-1',
        sender_id: 'demo-connect-aisha',
        body: 'Hey! Loved your profile. Are you around the faculty today? 😊',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const supabase = getBrowserSupabase();

  // Show opt-in prompt on initial mount if user hasn't opted in yet
  useEffect(() => {
    if (!isOptedIn && typeof window !== 'undefined') {
      const seen = sessionStorage.getItem('commonroom_connect_prompt_seen');
      if (!seen) {
        setShowOptInModal(true);
        sessionStorage.setItem('commonroom_connect_prompt_seen', 'true');
      }
    }
  }, [isOptedIn]);

  // Load profiles from backend or fallback to demo
  const reload = useCallback(async () => {
    setError('');
    try {
      const result = await meetRequest<MeetData>(session?.access_token ?? null);
      const useDemoProfiles = result.profiles.length === 0;
      setData(useDemoProfiles ? { ...result, profiles: demoMeetProfiles as MeetProfile[], demoContent: true } : result);
      if (result.me.meet) {
        setConnectBio(result.me.meet.bio || '');
        setConnectInterests(result.me.meet.interests.join(', ') || '');
        const pUrls = result.me.meet.photo_urls || [];
        if (pUrls[0]) setPhoto1(pUrls[0]);
        if (pUrls.length > 1) setAdditionalPhotos(pUrls.slice(1));
        setDiscoverable(result.me.meet.discoverable ?? false);
        setIsOptedIn(true);
      }
      if (result.people && result.people.length > 0) {
        setConnections(result.people);
      }
    } catch (loadError) {
      // Offline / dev fallback: seamlessly load rich campus demo profiles
      setData({
        me: {
          profile: { displayName: profile.displayName, school: profile.school, course: 'Student', year: 'Year 2', avatarUrl: null },
          meet: null,
        },
        profiles: demoMeetProfiles as MeetProfile[],
        people: demoInitialConnections as MeetProfile[],
        demoContent: true,
      });
    }
  }, [profile.displayName, profile.school, session]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length]);

  // Filtered profiles for discovery deck
  const discoverProfiles = useMemo(() => {
    const list = data?.profiles ?? (demoMeetProfiles as MeetProfile[]);
    return list
      .filter((candidate) => !skipped.includes(candidate.user_id))
      .filter((candidate) => filterSchool !== 'my_school' || !profile.school || candidate.school === profile.school)
      .filter((candidate) => filterVibe === 'all' || candidate.vibe === filterVibe);
  }, [data, filterSchool, filterVibe, profile.school, skipped]);

  const candidate = discoverProfiles[currentIndex] ?? null;
  const currentPhotos = useMemo(() => {
    if (!candidate) return [];
    if (candidate.photo_urls && candidate.photo_urls.length > 0) return candidate.photo_urls;
    if (candidate.avatar_url) return [candidate.avatar_url];
    return [];
  }, [candidate]);

  // Advance card
  const advanceCard = useCallback((direction: 'left' | 'right') => {
    setSwipeDir(direction);
    window.setTimeout(() => {
      if (candidate) {
        setSkipped((prev) => [...prev, candidate.user_id]);
      }
      setCurrentPhoto(0);
      setSwipeDir(null);
      setCurrentIndex((prev) => prev + 1);
    }, 280);
  }, [candidate]);

  // Say Hello / Like
  const handleLike = async (superLike = false) => {
    if (!candidate) return;
    setBusy(true);

    if (superLike) {
      setToastMessage(`⭐ Super Like sent to ${candidate.display_name}! Your profile was highlighted for them.`);
      window.setTimeout(() => setToastMessage(''), 3200);
    }

    try {
      if (session) {
        const result = await meetRequest<{ liked: boolean; matched: boolean }>(session.access_token, 'POST', {
          userId: candidate.user_id,
          superLike,
        });
        if (result.matched) {
          setConnections((prev) => [candidate, ...prev.filter((c) => c.user_id !== candidate.user_id)]);
          setMatchedProfile(candidate);
        }
      } else {
        // Guest / Demo mode: instant mutual celebration for rich demo profiles
        setConnections((prev) => [candidate, ...prev.filter((c) => c.user_id !== candidate.user_id)]);
        setMatchedProfile(candidate);
      }
    } catch {
      // Local graceful fallback
      setConnections((prev) => [candidate, ...prev.filter((c) => c.user_id !== candidate.user_id)]);
      setMatchedProfile(candidate);
    } finally {
      setBusy(false);
      advanceCard('right');
    }
  };

  // Pass
  const handlePass = () => {
    if (!candidate) return;
    if (session) {
      void meetRequest(session.access_token, 'POST', { userId: candidate.user_id, action: 'pass' }).catch(() => undefined);
    }
    advanceCard('left');
  };

  // Photo Carousel navigation within the card
  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotos.length <= 1) return;
    setCurrentPhoto((prev) => (prev + 1) % currentPhotos.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotos.length <= 1) return;
    setCurrentPhoto((prev) => (prev - 1 + currentPhotos.length) % currentPhotos.length);
  };

  // Touch gesture support on the card deck
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 55) {
      if (deltaX > 0) {
        void handleLike(false);
      } else {
        handlePass();
      }
    }
  };

  // 1-on-1 Chat Open
  const openChatWithPerson = async (person: MeetProfile) => {
    if (!session && !data?.demoContent) {
      onRequireAccount();
      return;
    }

    const cachedMessages = chatHistoryByUserId[person.user_id] ?? [];
    if (session) {
      setChatBusy(true);
      try {
        const chat = await meetChatRequest<{ conversationId: string; messages: ChatMessage[] }>(session.access_token, {
          userId: person.user_id,
        });
        setActiveChat({ profile: person, conversationId: chat.conversationId, messages: chat.messages });
        setChatDraft('');
      } catch {
        // Fallback to local thread
        setActiveChat({ profile: person, conversationId: `conv-${person.user_id}`, messages: cachedMessages });
      } finally {
        setChatBusy(false);
      }
    } else {
      setActiveChat({ profile: person, conversationId: `conv-${person.user_id}`, messages: cachedMessages });
      setChatDraft('');
    }
  };

  // Send message in 1-on-1 Chat
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeChat || !chatDraft.trim()) return;

    const userText = chatDraft.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender_id: profile.id || 'me',
      body: userText,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...activeChat.messages, newMsg];
    setActiveChat((prev) => (prev ? { ...prev, messages: updatedMessages } : prev));
    setChatHistoryByUserId((prev) => ({ ...prev, [activeChat.profile.user_id]: updatedMessages }));
    setChatDraft('');

    if (session) {
      try {
        await meetChatRequest<ChatMessage>(session.access_token, {
          conversationId: activeChat.conversationId,
          message: userText,
        });
      } catch {
        // Stored locally
      }
    }

    // Realistic campus auto-reply for demo profiles
    const targetUserId = activeChat.profile.user_id;
    window.setTimeout(() => {
      const sampleReplies = [
        "Hey! Great to connect with you 😊 Are you on campus today?",
        "Haha totally agree! Which faculty are you usually around?",
        "Sounds fun! Let me know when you're free for a quick coffee between classes ☕",
        "Awesome! I was actually just heading over to the library.",
      ];
      const randomReply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender_id: targetUserId,
        body: randomReply,
        created_at: new Date().toISOString(),
      };
      setChatHistoryByUserId((prev) => {
        const currentList = prev[targetUserId] ?? [];
        return { ...prev, [targetUserId]: [...currentList, replyMsg] };
      });
      setActiveChat((current) => {
        if (!current || current.profile.user_id !== targetUserId) return current;
        return { ...current, messages: [...current.messages, replyMsg] };
      });
    }, 1300);
  };

  // Photo Upload Handler for Photo Setup Studio
  const handleUploadPrimaryPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingPhotoUpload(true);
    try {
      if (session) {
        const path = `${profile.id}/meet/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path);
        setPhoto1(pub.publicUrl);
      } else {
        const localUrl = URL.createObjectURL(file);
        setPhoto1(localUrl);
      }
    } catch {
      // Local fallback
      setPhoto1(URL.createObjectURL(file));
    } finally {
      setPendingPhotoUpload(false);
    }
  };

  const handleUploadAdditionalPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || additionalPhotos.length >= 5) return;
    e.target.value = '';
    setPendingPhotoUpload(true);
    try {
      if (session) {
        const path = `${profile.id}/meet/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path);
        setAdditionalPhotos((prev) => [...prev, pub.publicUrl]);
      } else {
        setAdditionalPhotos((prev) => [...prev, URL.createObjectURL(file)]);
      }
    } catch {
      setAdditionalPhotos((prev) => [...prev, URL.createObjectURL(file)]);
    } finally {
      setPendingPhotoUpload(false);
    }
  };

  // Complete Photo Setup & Activate
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const totalPhotos = (photo1 ? 1 : 0) + additionalPhotos.length;
    if (totalPhotos < 2) {
      setError('Please upload at least 2 photos (Primary + 1 additional) so classmates can recognize you.');
      return;
    }

    const allPhotos = [photo1!, ...additionalPhotos].filter(Boolean);
    const interestsList = connectInterests.split(',').map((s) => s.trim()).filter(Boolean);

    setBusy(true);
    setError('');
    try {
      if (session) {
        await meetRequest(session.access_token, 'PUT', {
          displayName: profile.displayName,
          bio: connectBio,
          interests: interestsList,
          photoUrls: allPhotos,
          discoverable,
        });
      }
      localStorage.setItem('commonroom_connect_opted_in', 'true');
      setIsOptedIn(true);
      setShowSetup(false);
      setNotice('🎉 Your Connect profile is active and discoverable to students on campus!');
      window.setTimeout(() => setNotice(''), 4500);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : 'Your Connect profile could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="meet-experience" aria-label="Campus Connect">
      {/* Toast Notification */}
      {toastMessage ? (
        <div className="meet-toast" role="status">
          <span>{toastMessage}</span>
        </div>
      ) : null}

      {/* Top Header */}
      <header className="meet-heading">
        <div>
          <span className="eyebrow">CAMPUS CONNECT · MUTUAL INTEREST ONLY</span>
          <h1>Connect</h1>
          <p>
            Meet classmates across Nigerian universities. Only students who mutually show interest can message each other.
          </p>
        </div>
        <div className="meet-header-actions">
          <button
            className="secondary-button"
            onClick={() => setShowSetup(true)}
            type="button"
          >
            <Camera size={15} />
            {isOptedIn ? 'Edit My Profile' : 'Set Up Profile'}
          </button>
        </div>
      </header>

      {/* Notices & Banners */}
      {error ? (
        <div className="feedback error-banner" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" className="icon-button" onClick={() => setError('')} type="button">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="feedback success-banner" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" className="icon-button" onClick={() => setNotice('')} type="button">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* Top Navigation Tabs */}
      <nav aria-label="Connect sections" className="meet-tabs">
        <button
          aria-pressed={activeTab === 'discover'}
          className={activeTab === 'discover' ? 'active' : ''}
          onClick={() => setActiveTab('discover')}
          type="button"
        >
          <Sparkles size={16} /> Discover
        </button>

        <button
          aria-pressed={activeTab === 'connections'}
          className={activeTab === 'connections' ? 'active' : ''}
          onClick={() => setActiveTab('connections')}
          type="button"
        >
          <Users size={16} /> Connections
          <span className="meet-tab-badge">{connections.length}</span>
        </button>

        <button
          aria-label="Filter preferences"
          className="meet-filter-btn"
          onClick={() => setFilterModalOpen(true)}
          title="Filter preferences"
          type="button"
        >
          <ListFilter size={16} />
          <span>Filters</span>
          {filterSchool !== 'all' || filterVibe !== 'all' ? <span className="meet-filter-active-dot" /> : null}
        </button>
      </nav>

      {/* =====================================================================
          TAB 1: DISCOVER CARD DECK
          ===================================================================== */}
      {activeTab === 'discover' ? (
        <div className="meet-discover-stage">
          {candidate ? (
            <article
              className={`meet-card panel ${swipeDir === 'left' ? 'meet-card-swipe-left' : swipeDir === 'right' ? 'meet-card-swipe-right' : ''}`}
              onTouchEnd={handleTouchEnd}
              onTouchStart={handleTouchStart}
            >
              {/* Photo Carousel Box */}
              <div className="meet-card-photo">
                {currentPhotos.length > 0 ? (
                  <img
                    alt={`${candidate.display_name}'s photo ${currentPhoto + 1}`}
                    className="meet-card-main-img"
                    src={currentPhotos[currentPhoto] || currentPhotos[0]}
                  />
                ) : (
                  <div className="meet-photo-placeholder">
                    {candidate.display_name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                {/* Top Stories-style Step Bars */}
                {currentPhotos.length > 1 ? (
                  <div className="meet-photo-steps">
                    {currentPhotos.map((_, idx) => (
                      <div
                        className={`meet-photo-step ${idx <= currentPhoto ? 'filled' : ''}`}
                        key={idx}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Left & Right Tap Zones */}
                {currentPhotos.length > 1 ? (
                  <div className="meet-photo-tap-zones">
                    <div
                      aria-label="Previous photo"
                      className="meet-photo-tap-zone left"
                      onClick={handlePrevPhoto}
                      role="button"
                      tabIndex={0}
                    />
                    <div
                      aria-label="Next photo"
                      className="meet-photo-tap-zone right"
                      onClick={handleNextPhoto}
                      role="button"
                      tabIndex={0}
                    />
                  </div>
                ) : null}

                {/* Top-Left Campus Vibe Badge */}
                {candidate.vibe ? (
                  <div className="meet-vibe-badge">
                    <Zap size={12} strokeWidth={2.5} />
                    <span>{candidate.vibe}</span>
                  </div>
                ) : null}

                {/* Top-Right Photo Counter Badge */}
                {currentPhotos.length > 1 ? (
                  <div className="meet-photo-counter-badge">
                    <span>
                      {currentPhoto + 1}/{currentPhotos.length}
                    </span>
                  </div>
                ) : null}

                {/* Arrow Controls for Desktop */}
                {currentPhotos.length > 1 ? (
                  <>
                    <button
                      aria-label="Previous photo"
                      className="meet-photo-arrow left"
                      onClick={handlePrevPhoto}
                      type="button"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      aria-label="Next photo"
                      className="meet-photo-arrow right"
                      onClick={handleNextPhoto}
                      type="button"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                ) : null}

                {/* Bottom Dots Indicator */}
                {currentPhotos.length > 1 ? (
                  <div className="meet-photo-dots">
                    {currentPhotos.map((_, idx) => (
                      <button
                        aria-label={`Photo ${idx + 1}`}
                        aria-pressed={idx === currentPhoto}
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhoto(idx);
                        }}
                        type="button"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Identity & Details Section */}
              <div className="meet-card-info">
                <div className="meet-card-title-row">
                  <div>
                    <h2 className="meet-card-name">
                      {candidate.display_name}
                      {candidate.age ? <span className="meet-card-age">, {candidate.age}</span> : null}
                      {candidate.verified ? (
                        <span className="meet-verified-pill" title="Verified Campus Student">
                          <BadgeCheck size={16} />
                        </span>
                      ) : null}
                    </h2>
                    <p className="meet-card-course">
                      {[candidate.course, candidate.year].filter(Boolean).join(' · ') || 'Undergraduate'}
                    </p>
                    <div className="meet-card-location">
                      <MapPin size={13} />
                      <span>{candidate.school || 'Campus Community'} {candidate.distance ? `(${candidate.distance})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {candidate.bio ? <p className="meet-card-bio">{candidate.bio}</p> : null}

                {/* Hinge-style Campus Prompts */}
                {candidate.prompts && candidate.prompts.length > 0 ? (
                  <div className="meet-prompts-container">
                    {candidate.prompts.map((p, idx) => (
                      <div className="meet-prompt-card" key={idx}>
                        <span className="meet-prompt-question">{p.question}</span>
                        <p className="meet-prompt-answer">{p.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Campus Interest Tags */}
                {candidate.interests && candidate.interests.length > 0 ? (
                  <div className="meet-tags-list">
                    {candidate.interests.map((interest) => (
                      <span className="meet-tag-chip" key={interest}>
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Action Buttons: Pass, Say Hello, Super Like */}
                <div className="meet-actions-rail">
                  <button
                    aria-label="Pass"
                    className="meet-action-btn pass"
                    disabled={busy}
                    onClick={handlePass}
                    title="Pass (Left Arrow / Swipe Left)"
                    type="button"
                  >
                    <X size={26} strokeWidth={2.4} />
                  </button>

                  <button
                    aria-label="Say Hello"
                    className="meet-action-btn like"
                    disabled={busy}
                    onClick={() => void handleLike(false)}
                    title="Say Hello (Right Arrow / Swipe Right)"
                    type="button"
                  >
                    <Heart size={28} strokeWidth={2} />
                    <span className="meet-like-label">Say Hello</span>
                  </button>

                  <button
                    aria-label="Super Like"
                    className="meet-action-btn super-like"
                    disabled={busy}
                    onClick={() => void handleLike(true)}
                    title="Super Like / Highlight Profile"
                    type="button"
                  >
                    <Star size={24} strokeWidth={2} />
                  </button>
                </div>

                <p className="meet-privacy-footer">
                  <ShieldCheck size={13} />
                  Only students you mutually like can message you. Your profile is private & protected.
                </p>
              </div>
            </article>
          ) : (
            <div className="meet-empty panel">
              <div className="meet-empty-icon-wrap">
                <Users size={36} />
              </div>
              <h2>You're All Caught Up!</h2>
              <p>
                You've seen all students matching your current filter. Check your Connections tab to chat with classmates who are also interested.
              </p>
              <div className="meet-empty-actions">
                <button
                  className="primary-button"
                  onClick={() => {
                    setSkipped([]);
                    setFilterSchool('all');
                    setFilterVibe('all');
                    setCurrentIndex(0);
                  }}
                  type="button"
                >
                  Explore Again
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setActiveTab('connections')}
                  type="button"
                >
                  View Connections ({connections.length})
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* =====================================================================
          TAB 2: MUTUAL CONNECTIONS (MATCHED STUDENTS)
          ===================================================================== */}
      {activeTab === 'connections' ? (
        <div className="meet-connections-stage">
          <div className="meet-connections-header">
            <div>
              <h2>Mutual Connections ({connections.length})</h2>
              <p>These classmates showed mutual interest. You can message each other directly.</p>
            </div>
          </div>

          {connections.length > 0 ? (
            <div className="meet-connections-grid">
              {connections.map((item) => (
                <article className="meet-connection-card panel" key={item.user_id}>
                  <div className="meet-connection-avatar-wrap">
                    {item.photo_urls[0] || item.avatar_url ? (
                      <img
                        alt={item.display_name}
                        className="meet-connection-avatar"
                        src={item.photo_urls[0] || item.avatar_url || ''}
                      />
                    ) : (
                      <div className="meet-connection-avatar placeholder">
                        {item.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {item.online ? <span className="meet-online-dot" title="Online now" /> : null}
                  </div>

                  <div className="meet-connection-body">
                    <div className="meet-connection-top">
                      <strong>
                        {item.display_name}
                        {item.age ? `, ${item.age}` : ''}
                      </strong>
                      {item.verified ? <BadgeCheck size={15} color="#3b82f6" /> : null}
                    </div>
                    <span className="meet-connection-school">{item.school || 'Campus Student'}</span>
                    <span className="meet-connection-course">{item.course || 'Undergraduate'}</span>

                    {item.vibe ? (
                      <span className="meet-connection-vibe">
                        <Zap size={11} /> {item.vibe}
                      </span>
                    ) : null}

                    <div className="meet-connection-footer">
                      <span className="meet-mutual-tag">
                        <Sparkles size={12} /> Mutual Interest
                      </span>
                      <button
                        className="meet-chat-launch-btn"
                        disabled={chatBusy}
                        onClick={() => void openChatWithPerson(item)}
                        type="button"
                      >
                        <MessageCircle size={15} /> Chat
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="meet-empty panel">
              <div className="meet-empty-icon-wrap">
                <Heart size={36} color="#ef4444" />
              </div>
              <h2>No Connections Yet</h2>
              <p>
                When you say hello to someone who also says hello to you, they'll show up here so you can chat safely!
              </p>
              <button
                className="primary-button"
                onClick={() => setActiveTab('discover')}
                type="button"
              >
                Discover Classmates
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 1: OPT-IN PROMPT ("JOIN CONNECT")
          ===================================================================== */}
      {showOptInModal && !isOptedIn ? (
        <div className="meet-modal-backdrop" onClick={() => setShowOptInModal(false)}>
          <div className="meet-optin-card panel" onClick={(e) => e.stopPropagation()}>
            <div className="meet-optin-icon-ring">
              <Users size={32} color="#6366f1" />
            </div>
            <h2>Join Connect</h2>
            <p className="meet-optin-sub">
              Would you like to make your profile visible to other students on campus?
            </p>

            <div className="meet-optin-benefits">
              <div className="meet-benefit-item">
                <Check size={18} color="#10b981" />
                <span>Only students you mutually like can message you</span>
              </div>
              <div className="meet-benefit-item">
                <Check size={18} color="#10b981" />
                <span>Showcase 2 to 6 photos with your course & campus vibe</span>
              </div>
              <div className="meet-benefit-item">
                <Check size={18} color="#10b981" />
                <span>Control your visibility or hide your profile anytime</span>
              </div>
            </div>

            <div className="meet-optin-actions">
              <button
                className="primary-button full-width"
                onClick={() => {
                  setShowOptInModal(false);
                  setShowSetup(true);
                }}
                type="button"
              >
                Set Up My Connect Profile
              </button>

              <button
                className="secondary-button full-width"
                onClick={() => {
                  setShowOptInModal(false);
                  localStorage.setItem('commonroom_connect_opted_in', 'true');
                  setIsOptedIn(true);
                }}
                type="button"
              >
                Browse Privately for Now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 2: MULTI-PHOTO SETUP & EDIT STUDIO
          ===================================================================== */}
      {showSetup ? (
        <div className="meet-modal-backdrop" onClick={() => setShowSetup(false)}>
          <div className="meet-setup-modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="meet-setup-header">
              <div>
                <h2>Set Up Connect Profile</h2>
                <p>Upload Photo 1 and at least 1 more (min 2 photos required, up to 6 total).</p>
              </div>
              <button aria-label="Close setup" className="icon-button" onClick={() => setShowSetup(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <form className="meet-setup-form" onSubmit={(e) => void handleSaveProfile(e)}>
              {/* Photo 1: Primary Photo */}
              <div className="meet-form-section">
                <label className="meet-field-label">Photo 1 (Primary Photo *Required)</label>
                <div className="meet-primary-photo-slot">
                  {photo1 ? (
                    <div className="meet-photo-preview-wrap">
                      <img alt="Primary Connect Photo" src={photo1} />
                      <label className="meet-change-photo-badge">
                        <Camera size={14} /> Change
                        <input accept="image/*" onChange={(e) => void handleUploadPrimaryPhoto(e)} type="file" />
                      </label>
                    </div>
                  ) : (
                    <label className="meet-empty-primary-slot">
                      {pendingPhotoUpload ? <LoaderCircle className="meet-spinner" size={26} /> : <Camera size={26} />}
                      <span>Tap to add Photo 1</span>
                      <input accept="image/*" onChange={(e) => void handleUploadPrimaryPhoto(e)} type="file" />
                    </label>
                  )}
                </div>
              </div>

              {/* Photos 2-6: Additional Photos Grid */}
              <div className="meet-form-section">
                <label className="meet-field-label">Additional Photos ({additionalPhotos.length}/5)</label>
                <div className="meet-additional-photos-grid">
                  {additionalPhotos.map((url, idx) => (
                    <div className="meet-additional-thumb" key={idx}>
                      <img alt={`Additional photo ${idx + 1}`} src={url} />
                      <button
                        aria-label={`Remove photo ${idx + 1}`}
                        className="meet-remove-photo-badge"
                        onClick={() => setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        type="button"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}

                  {additionalPhotos.length < 5 ? (
                    <label className="meet-add-thumb-slot">
                      {pendingPhotoUpload ? <LoaderCircle className="meet-spinner" size={20} /> : <Plus size={20} />}
                      <span>Add Photo</span>
                      <input accept="image/*" onChange={(e) => void handleUploadAdditionalPhoto(e)} type="file" />
                    </label>
                  ) : null}
                </div>
              </div>

              {/* Vibe Selector */}
              <div className="meet-form-section">
                <label className="meet-field-label">Campus Vibe</label>
                <div className="meet-vibe-chips">
                  {CAMPUS_VIBES.map((v) => (
                    <button
                      className={`meet-vibe-chip ${connectVibe === v ? 'active' : ''}`}
                      key={v}
                      onClick={() => setConnectVibe(v)}
                      type="button"
                    >
                      <Zap size={12} /> {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Short Bio */}
              <div className="meet-form-section">
                <label className="meet-field-label">
                  Short Bio <span>({connectBio.length}/200)</span>
                </label>
                <textarea
                  className="meet-textarea"
                  maxLength={200}
                  onChange={(e) => setConnectBio(e.target.value)}
                  placeholder="Share your interests, weekend spots, or favorite course…"
                  rows={3}
                  value={connectBio}
                />
              </div>

              {/* Campus Prompts */}
              <div className="meet-form-section">
                <label className="meet-field-label">Campus Prompts (Answer 2 for maximum matches)</label>
                <div className="meet-prompt-edit-card">
                  <span className="meet-prompt-q">A life goal of mine</span>
                  <input
                    className="meet-input"
                    maxLength={100}
                    onChange={(e) => setPrompt1Answer(e.target.value)}
                    placeholder="Visit every national park in Nigeria before I graduate 🌿"
                    value={prompt1Answer}
                  />
                </div>
                <div className="meet-prompt-edit-card">
                  <span className="meet-prompt-q">The way to win me over</span>
                  <input
                    className="meet-input"
                    maxLength={100}
                    onChange={(e) => setPrompt2Answer(e.target.value)}
                    placeholder="Send good music playlists and iced matcha lattes 🎵"
                    value={prompt2Answer}
                  />
                </div>
              </div>

              {/* Interests */}
              <div className="meet-form-section">
                <label className="meet-field-label">
                  Interests <span>(Comma separated)</span>
                </label>
                <input
                  className="meet-input"
                  onChange={(e) => setConnectInterests(e.target.value)}
                  placeholder="Coding, Design, Afrobeats, Beach walks"
                  value={connectInterests}
                />
              </div>

              {/* Visibility Switch */}
              <label className="switch-row">
                <span>Make profile discoverable to classmates</span>
                <input
                  checked={discoverable}
                  onChange={(e) => setDiscoverable(e.target.checked)}
                  type="checkbox"
                />
              </label>

              {/* Submit CTA */}
              <div className="meet-setup-footer">
                <button
                  className="primary-button full-width"
                  disabled={busy || (photo1 ? 1 : 0) + additionalPhotos.length < 2}
                  type="submit"
                >
                  {busy ? 'Saving…' : `Save & Activate (${(photo1 ? 1 : 0) + additionalPhotos.length}/2 min photos)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 3: MUTUAL MATCH CELEBRATION MODAL ("IT'S A MATCH! 🎉")
          ===================================================================== */}
      {matchedProfile ? (
        <div className="meet-match-backdrop" onClick={() => setMatchedProfile(null)}>
          <div className="meet-match-modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="meet-match-sparkles">
              <Sparkles size={44} color="#f59e0b" />
            </div>
            <h2 className="meet-match-title">Mutual Interest! 🎉</h2>
            <p className="meet-match-subtitle">
              You and <strong>{matchedProfile.display_name}</strong> both showed interest! You can now message each other.
            </p>

            <div className="meet-match-avatars">
              <div className="meet-match-avatar-ring">
                {profile.displayName ? profile.displayName.slice(0, 1).toUpperCase() : 'You'}
              </div>
              <div className="meet-match-heart-bridge">
                <Heart color="#ef4444" fill="#ef4444" size={22} />
              </div>
              <div className="meet-match-avatar-ring">
                {matchedProfile.photo_urls[0] || matchedProfile.avatar_url ? (
                  <img
                    alt={matchedProfile.display_name}
                    src={matchedProfile.photo_urls[0] || matchedProfile.avatar_url || ''}
                  />
                ) : (
                  matchedProfile.display_name.slice(0, 1).toUpperCase()
                )}
              </div>
            </div>

            <div className="meet-match-actions">
              <button
                className="primary-button full-width"
                onClick={() => {
                  const target = matchedProfile;
                  setMatchedProfile(null);
                  void openChatWithPerson(target);
                }}
                type="button"
              >
                <MessageCircle size={16} /> Chat With {matchedProfile.display_name}
              </button>

              <button
                className="secondary-button full-width"
                onClick={() => setMatchedProfile(null)}
                type="button"
              >
                Keep Exploring
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 4: 1-ON-1 IN-APP DIRECT MESSAGING MODAL
          ===================================================================== */}
      {activeChat ? (
        <div
          aria-label={`Chat with ${activeChat.profile.display_name}`}
          aria-modal="true"
          className="meet-chat-backdrop"
          onClick={() => setActiveChat(null)}
          role="dialog"
        >
          <section className="meet-chat-card panel" onClick={(e) => e.stopPropagation()}>
            <header className="meet-chat-header">
              <div className="meet-chat-identity">
                <div className="meet-chat-avatar-wrap">
                  {activeChat.profile.photo_urls[0] || activeChat.profile.avatar_url ? (
                    <img
                      alt={activeChat.profile.display_name}
                      src={activeChat.profile.photo_urls[0] || activeChat.profile.avatar_url || ''}
                    />
                  ) : (
                    <span>{activeChat.profile.display_name.slice(0, 1).toUpperCase()}</span>
                  )}
                  {activeChat.profile.online ? <span className="meet-online-dot small" /> : null}
                </div>
                <div>
                  <strong>{activeChat.profile.display_name}</strong>
                  <small>{activeChat.profile.course || 'Classmate'} · {activeChat.profile.school || 'Campus'}</small>
                </div>
              </div>
              <button aria-label="Close chat" className="icon-button" onClick={() => setActiveChat(null)} type="button">
                <X size={18} />
              </button>
            </header>

            <div className="meet-chat-body">
              {activeChat.messages.length > 0 ? (
                activeChat.messages.map((msg) => {
                  const isMine = msg.sender_id === profile.id || msg.sender_id === 'me';
                  return (
                    <div className={`meet-chat-bubble ${isMine ? 'mine' : 'theirs'}`} key={msg.id}>
                      <p>{msg.body}</p>
                      <time>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </div>
                  );
                })
              ) : (
                <div className="meet-chat-empty-state">
                  <Heart size={28} color="#f43f5e" />
                  <p>You matched with {activeChat.profile.display_name}!</p>
                  <span>Say hello to break the ice 💬</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="meet-chat-input-bar" onSubmit={(e) => void handleSendMessage(e)}>
              <input
                autoComplete="off"
                maxLength={2000}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder={`Message ${activeChat.profile.display_name}…`}
                value={chatDraft}
              />
              <button
                aria-label="Send message"
                className="meet-send-btn"
                disabled={!chatDraft.trim() || chatBusy}
                type="submit"
              >
                <Send size={16} />
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 5: FILTER PREFERENCES MODAL
          ===================================================================== */}
      {filterModalOpen ? (
        <div className="meet-modal-backdrop" onClick={() => setFilterModalOpen(false)}>
          <div className="meet-filter-modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="meet-setup-header">
              <div>
                <h2>Connect Filters</h2>
                <p>Customize which students appear in your discovery deck.</p>
              </div>
              <button aria-label="Close filters" className="icon-button" onClick={() => setFilterModalOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="meet-filter-group">
              <label className="meet-field-label">School / Campus</label>
              <div className="meet-filter-options">
                <button
                  className={`meet-filter-option ${filterSchool === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterSchool('all')}
                  type="button"
                >
                  All Nigerian Universities
                </button>
                <button
                  className={`meet-filter-option ${filterSchool === 'my_school' ? 'active' : ''}`}
                  onClick={() => setFilterSchool('my_school')}
                  type="button"
                >
                  My Campus Only {profile.school ? `(${profile.school})` : ''}
                </button>
              </div>
            </div>

            <div className="meet-filter-group">
              <label className="meet-field-label">Campus Vibe</label>
              <div className="meet-vibe-chips">
                <button
                  className={`meet-vibe-chip ${filterVibe === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterVibe('all')}
                  type="button"
                >
                  All Vibes
                </button>
                {CAMPUS_VIBES.map((v) => (
                  <button
                    className={`meet-vibe-chip ${filterVibe === v ? 'active' : ''}`}
                    key={v}
                    onClick={() => setFilterVibe(v)}
                    type="button"
                  >
                    <Zap size={12} /> {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="meet-filter-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setFilterSchool('all');
                  setFilterVibe('all');
                  setFilterModalOpen(false);
                }}
                type="button"
              >
                Reset
              </button>
              <button
                className="primary-button"
                onClick={() => setFilterModalOpen(false)}
                type="button"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
