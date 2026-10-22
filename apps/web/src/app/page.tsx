'use client';

import {
  Bell,
  ChevronDown,
  Compass,
  Dices,
  Eye,
  EyeOff,
  Heart,
  Home as HomeIcon,
  ImagePlus,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sun,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AnonymousExperience } from '@/components/AnonymousExperience';
import { CommunityAnnouncement } from '@/components/CommunityAnnouncement';
import { GamesExperience } from '@/components/GamesExperience';
import { MarketplaceExperience } from '@/components/MarketplaceExperience';
import { MeetExperience } from '@/components/MeetExperience';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { PhotoReelEditor } from '@/components/PhotoReelEditor';
import { RoomExperience } from '@/components/RoomExperience';
import { ReelEditor } from '@/components/ReelEditor';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Audience, FeedPost, MediaItem, MediaType, OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';
import { compressMedia } from '@/lib/media-compression';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

type AppTab = 'home' | 'create' | 'anonymous' | 'marketplace' | 'games' | 'meet' | 'profile';
type ProfileRecord = {
  id: string;
  displayName: string;
  username: string | null;
  educationStatus: OnboardingProfile['educationStatus'];
  school: string | null;
  showSchoolOnProfile: boolean;
  course: string;
  year: string;
  ageEligibilityConfirmed: boolean;
  interests: string[];
};
type ProfileApiRecord = {
  id: string;
  display_name: string;
  username: string | null;
  education_status: OnboardingProfile['educationStatus'];
  school: string | null;
  show_school_on_profile: boolean;
  course: string;
  year: string;
  age_eligibility_confirmed: boolean;
  interests: string[];
};
type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };
type LocationSuggestion = { id: string; name: string; detail: string; label: string };
type AnonymousIdentity = { handle: string; created_at: string };
type AnonymousMediaItem = { path: string; mediaType: 'photo' | 'video' };
const anonymousTextTemplates = [
  { id: 'blue-hour', name: 'Blue hour', className: 'create-text-card-blue', background: 'linear-gradient(145deg, #2358c9, #6f47d8)' },
  { id: 'soft-sky', name: 'Soft sky', className: 'create-text-card-sky', background: 'linear-gradient(145deg, #1ca7bd, #476fda)' },
  { id: 'warm-glow', name: 'Warm glow', className: 'create-text-card-warm', background: 'linear-gradient(145deg, #e08036, #d44872)' },
  { id: 'rose-note', name: 'Rose note', className: 'create-text-card-rose', background: 'linear-gradient(145deg, #d33e7a, #814bd2)' },
] as const;

function mediaFileExtension(file: File) {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  return extensions[file.type];
}

function mediaSavingsMessage(sourceBytes: number, uploadedBytes: number) {
  if (sourceBytes === 0) return '';
  const savedPercent = sourceBytes > 0 ? Math.round((sourceBytes - uploadedBytes) / sourceBytes * 100) : 0;
  return savedPercent > 0
    ? `Media optimized on your device and reduced by ${savedPercent}%.`
    : 'Media was checked and is already optimized for upload.';
}

async function apiRequest<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok) {
    const failure = result as ApiFailure | null;
    throw new Error(failure?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  if (!result || !('data' in result)) throw new Error('The API returned an invalid response.');
  return result.data;
}

function formatPostType(type: Extract<MediaType, 'photo' | 'video' | 'text'>) {
  return type === 'video' ? 'Video' : type === 'photo' ? 'Photo' : 'Text';
}

export default function Home() {
  const pathname = usePathname();
  const focusPostId = pathname?.startsWith('/posts/') ? pathname.split('/')[2] ?? null : null;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [tab, setTabState] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('commonroom_active_tab') as AppTab;
      if (saved && ['home', 'create', 'meet', 'marketplace', 'games', 'anonymous', 'profile'].includes(saved)) {
        return saved;
      }
    }
    return 'home';
  });
  const setTab = useCallback((nextTab: AppTab) => {
    setTabState(nextTab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('commonroom_active_tab', nextTab);
    }
  }, []);
  const [roomRefresh, setRoomRefresh] = useState(0);
  const [authRoute, setAuthRoute] = useState<'welcome' | 'sign-in' | 'sign-up' | 'forgot-password'>('welcome');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'apple'>('email');
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [signupName, setSignupName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [educationStatus, setEducationStatus] = useState<OnboardingProfile['educationStatus']>('currently_in_school');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [school, setSchool] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [showSchool, setShowSchool] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [createType, setCreateType] = useState<MediaType>('photo');
  const [createDestination, setCreateDestination] = useState<'room' | 'anonymous'>('room');
  const [anonymousTitle, setAnonymousTitle] = useState('');
  const [anonymousIdentity, setAnonymousIdentity] = useState<AnonymousIdentity | null>(null);
  const [anonymousHandleDraft, setAnonymousHandleDraft] = useState('');
  const [anonymousIdentitySessionId, setAnonymousIdentitySessionId] = useState<string | null>(null);
  const [anonymousIdentitySaving, setAnonymousIdentitySaving] = useState(false);
  const [anonymousTemplate, setAnonymousTemplate] = useState<(typeof anonymousTextTemplates)[number]['id']>('blue-hour');
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [anonymousFocusPostId, setAnonymousFocusPostId] = useState<string | null>(null);
  const [createCaption, setCreateCaption] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createAudience, setCreateAudience] = useState<Audience>('Public');
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [photoReelEditorOpen, setPhotoReelEditorOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearchState, setLocationSearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [reelEditorOpen, setReelEditorOpen] = useState(false);
  const [selectedSoundName, setSelectedSoundName] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; file: File; isVideo: boolean } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: '1', actor: 'Joyce A.', text: 'liked your lecture photo from ABU', time: '15m ago', type: 'like', read: false },
    { id: '2', actor: 'Mide B.', text: 'commented on study group: "Library 3rd floor quiet corner is the best."', time: '1h ago', type: 'comment', read: false },
    { id: '3', actor: 'Chidi Eze', text: 'started following you on Commonroom', time: '3h ago', type: 'follow', read: false },
    { id: '4', actor: 'Community', text: 'Mid-term registration closes on Friday across faculties.', time: '1d ago', type: 'alert', read: true },
  ]);

  const configuredNow = isSupabaseConfigured();
  const anonymousIdentityLoading = createDestination === 'anonymous'
    && Boolean(session)
    && anonymousIdentitySessionId !== session?.user.id;
  const createPreviewUrls = useMemo(() => createFiles.map((file) => URL.createObjectURL(file)), [createFiles]);

  useEffect(() => () => {
    createPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [createPreviewUrls]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!previewFile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile]);

  useEffect(() => {
    if (createDestination !== 'anonymous' || !session) return;
    let active = true;
    void apiRequest<AnonymousIdentity | null>('/api/v1/anonymous/identity', session.access_token)
      .then((identity) => {
        if (!active) return;
        setAnonymousIdentitySessionId(session.user.id);
        setAnonymousIdentity(identity);
        if (identity) {
          setAnonymousHandleDraft(identity.handle);
          localStorage.setItem('anonymous_handle', identity.handle);
        } else {
          setAnonymousHandleDraft(localStorage.getItem('anonymous_handle') ?? '');
        }
      })
      .catch((identityError: unknown) => {
        if (active) {
          setAnonymousIdentitySessionId(session.user.id);
          setAnonymousIdentity(null);
          setError(identityError instanceof Error ? identityError.message : 'Your Anonymous name could not be loaded.');
        }
      });
    return () => { active = false; };
  }, [createDestination, session]);

  useEffect(() => {
    const query = createLocation.trim();
    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLocationSearchState('loading');
      void fetch(`/api/v1/locations/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => {
          const result = await response.json() as ApiEnvelope<LocationSuggestion[]> | ApiFailure;
          if (!response.ok) throw new Error((result as ApiFailure).error?.message ?? 'Location suggestions are temporarily unavailable.');
          if (!('data' in result) || !Array.isArray(result.data)) throw new Error('Location suggestions returned an invalid response.');
          setLocationSuggestions(result.data);
          setLocationSearchState('ready');
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setLocationSuggestions([]);
          setLocationSearchState('error');
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [createLocation]);
  const filteredInstitutions = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    return institutions.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(query)).slice(0, 12);
  }, [schoolSearch]);

  const loadProfile = useCallback(async (activeSession: Session) => {
    const record = await apiRequest<ProfileApiRecord | null>('/api/v1/profile', activeSession.access_token);
    if (record) {
      const profileRecord: ProfileRecord = {
        id: record.id,
        displayName: record.display_name,
        username: record.username,
        educationStatus: record.education_status,
        school: record.school,
        showSchoolOnProfile: record.show_school_on_profile,
        course: record.course,
        year: record.year,
        ageEligibilityConfirmed: record.age_eligibility_confirmed,
        interests: record.interests,
      };
      setProfile(profileRecord);
      setDisplayName(profileRecord.displayName);
      setSchool(profileRecord.school ?? '');
      setCourse(profileRecord.course);
      setYear(profileRecord.year);
      setEducationStatus(profileRecord.educationStatus);
      setAgeConfirmed(profileRecord.ageEligibilityConfirmed);
      setInterests(profileRecord.interests);
      setShowSchool(profileRecord.showSchoolOnProfile);
    } else {
      setProfile(null);
      setDisplayName(activeSession.user.user_metadata.display_name ?? '');
      setTab('profile');
    }
  }, []);

  useEffect(() => {
    setConfigured(configuredNow);
    if (!configuredNow) {
      setLoading(false);
      return;
    }

    let active = true;
    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      let activeSession = data.session;
      if (!activeSession) {
        try {
          const guest = await supabase.auth.signInAnonymously();
          if (!guest.error && guest.data.session) {
            activeSession = guest.data.session;
          }
        } catch {
          // If anonymous sign in is disabled, proceed as guest
        }
      }
      setSession(activeSession);
      if (activeSession && !activeSession.user.is_anonymous) {
        try {
          await loadProfile(activeSession);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Your profile could not be loaded.');
        }
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setError('');
      if (nextSession && !nextSession.user.is_anonymous) {
        setAuthModalOpen(false);
        queueMicrotask(() => {
          void loadProfile(nextSession).catch((loadError: unknown) => {
            if (active) setError(loadError instanceof Error ? loadError.message : 'Your profile could not be loaded.');
          });
        });
      } else {
        setProfile(null);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configuredNow, loadProfile]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const supabase = getBrowserSupabase();
      if (authRoute === 'sign-up') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: signupName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setAuthModalOpen(false);
          await loadProfile(data.session);
        } else {
          setNotice('Check your email to confirm your account, then return here to sign in.');
          setAuthRoute('sign-in');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setAuthModalOpen(false);
          await loadProfile(data.session);
        }
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    }
  };

  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const { error: resetError } = await getBrowserSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (resetError) throw resetError;
      setNotice('If an account exists for that email, a password reset link has been sent.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset could not be requested.');
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    try {
      const supabase = getBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google sign-in failed.');
    }
  };

  const signInWithApple = async () => {
    setError('');
    try {
      const { error: authError } = await getBrowserSupabase().auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Apple sign-in failed.');
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setError('');
    if (!displayName.trim() || !ageConfirmed || (educationStatus === 'currently_in_school' && !school)) {
      setError('Add a display name, confirm age eligibility, and choose a school if you are currently studying.');
      return;
    }
    try {
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', session.access_token, 'PUT', {
        educationStatus,
        school: educationStatus === 'currently_in_school' ? school : null,
        showSchoolOnProfile: showSchool,
        displayName,
        course,
        year,
        ageEligibilityConfirmed: ageConfirmed,
        interests,
      });
      setProfile({
        id: saved.id,
        displayName: saved.display_name,
        username: saved.username,
        educationStatus: saved.education_status,
        school: saved.school,
        showSchoolOnProfile: saved.show_school_on_profile,
        course: saved.course,
        year: saved.year,
        ageEligibilityConfirmed: saved.age_eligibility_confirmed,
        interests: saved.interests,
      });
      setTab('home');
      setNotice('Your profile is saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your profile could not be saved.');
    }
  };

  const completeOnboarding = async (profileDraft: OnboardingProfile) => {
    if (!session) throw new Error('Your session expired. Sign in again to finish setting up your profile.');
    const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', session.access_token, 'PUT', profileDraft);
    const savedProfile: ProfileRecord = {
      id: saved.id,
      displayName: saved.display_name,
      username: saved.username,
      educationStatus: saved.education_status,
      school: saved.school,
      showSchoolOnProfile: saved.show_school_on_profile,
      course: saved.course,
      year: saved.year,
      ageEligibilityConfirmed: saved.age_eligibility_confirmed,
      interests: saved.interests,
    };
    setProfile(savedProfile);
    setDisplayName(savedProfile.displayName);
    setSchool(savedProfile.school ?? '');
    setCourse(savedProfile.course);
    setYear(savedProfile.year);
    setEducationStatus(savedProfile.educationStatus);
    setAgeConfirmed(savedProfile.ageEligibilityConfirmed);
    setInterests(savedProfile.interests);
    setShowSchool(savedProfile.showSchoolOnProfile);
    setTab('home');
    setNotice('Your profile is ready. Welcome to Commonroom!');
  };

  const saveAnonymousIdentity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setError('Your guest session is still starting. Try again in a moment.');
      return;
    }
    setAnonymousIdentitySaving(true);
    setError('');
    try {
      const identity = await apiRequest<AnonymousIdentity>('/api/v1/anonymous/identity', session.access_token, 'POST', {
        handle: anonymousHandleDraft.trim(),
      });
      setAnonymousIdentity(identity);
      setAnonymousHandleDraft(identity.handle);
      localStorage.setItem('anonymous_handle', identity.handle);
      setNotice(`You’re ready to post as ${identity.handle}.`);
    } catch (identityError) {
      setError(identityError instanceof Error ? identityError.message : 'Your Anonymous name could not be saved.');
    } finally {
      setAnonymousIdentitySaving(false);
    }
  };

  const publishAnonymousPost = async () => {
    if (!session) {
      setError('Your guest session is still starting. Try again in a moment.');
      return;
    }
    if (!anonymousIdentity) {
      setError('Choose your Anonymous name before posting.');
      return;
    }
    if (!createCaption.trim()) {
      setError('Add something to your anonymous post first.');
      return;
    }
    const uploadedPaths: string[] = [];
    setError('');
    setNotice('');
    setCompressionProgress(createFiles.length ? 0 : null);
    try {
      const storage = getBrowserSupabase().storage.from('post-media');
      const mediaItems: AnonymousMediaItem[] = [];
      let uploadedBytes = 0;
      const sourceBytes = createFiles.reduce((total, file) => total + file.size, 0);
      for (const [index, originalFile] of createFiles.entries()) {
        const file = await compressMedia(originalFile, (progress) => {
          setCompressionProgress(Math.round(((index + progress / 100) / createFiles.length) * 100));
        });
        setCompressionProgress(Math.round(((index + 1) / createFiles.length) * 100));
        if (file.size > 100 * 1024 * 1024) throw new Error(`This media file is still over 100 MB after compression: ${originalFile.name}`);
        uploadedBytes += file.size;
        const extension = mediaFileExtension(file);
        if (!extension) throw new Error(`This format cannot be uploaded: ${originalFile.name}. Choose a JPG, PNG, WebP, MP4, MOV, or WebM file.`);
        const { path } = await apiRequest<{ path: string }>('/api/v1/anonymous/media-path', session.access_token, 'POST', { extension });
        uploadedPaths.push(path);
        const { error: uploadError } = await storage.upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        mediaItems.push({ path, mediaType: file.type.startsWith('video/') ? 'video' : 'photo' });
      }
      const created = await apiRequest<{ id: string }>('/api/v1/anonymous/posts', session.access_token, 'POST', {
        scope: 'all_nigerian_schools',
        title: anonymousTitle.trim() || 'Anonymous post',
        body: createCaption,
        mediaItems,
        cardTheme: anonymousTemplate,
      });
      setCreateCaption('');
      setAnonymousTitle('');
      setCreateFiles([]);
      setSelectedSoundName(null);
      setCompressionProgress(null);
      setAnonymousFocusPostId(created.id);
      setTab('anonymous');
      const savings = mediaSavingsMessage(sourceBytes, uploadedBytes);
      setNotice(`Your post is live in the Anonymous Feed.${savings ? ` ${savings}` : ''}`);
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : 'Your anonymous post could not be published.';
      if (uploadedPaths.length) {
        const { error: cleanupError } = await getBrowserSupabase().storage.from('post-media').remove(uploadedPaths);
        setError(cleanupError ? `${message} Uploaded media could not be cleaned up: ${cleanupError.message}` : message);
      } else {
        setError(message);
      }
    } finally {
      setCompressionProgress(null);
    }
  };

  const publishPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (createDestination === 'anonymous') {
      await publishAnonymousPost();
      return;
    }
    setError('');
    setNotice('');
    setCompressionProgress(createFiles.length ? 0 : null);
    try {
      const mediaItems: MediaItem[] = [];
      let uploadedBytes = 0;
      const sourceBytes = createFiles.reduce((total, file) => total + file.size, 0);
      if (createFiles.length > 10) throw new Error('Choose up to 10 photos for a Room post.');
      for (const [index, originalFile] of createFiles.entries()) {
        const file = await compressMedia(originalFile, (progress) => {
          setCompressionProgress(Math.round(((index + progress / 100) / createFiles.length) * 100));
        });
        setCompressionProgress(Math.round(((index + 1) / createFiles.length) * 100));
        if (file.size > 100 * 1024 * 1024) throw new Error(`This media file is still over 100 MB after compression: ${originalFile.name}`);
        uploadedBytes += file.size;
        const isVideo = file.type.startsWith('video/');
        if ((createType === 'video') !== isVideo) {
          throw new Error('Choose media that matches the selected post type.');
        }
        if (createType === 'video' && createFiles.length > 1) {
          throw new Error('A video post can contain one video.');
        }
        const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const supabase = getBrowserSupabase();
        const { data, error: uploadError } = await supabase.storage.from('post-media').upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('post-media').getPublicUrl(data.path);
        mediaItems.push({ uri: publicUrl.publicUrl, mediaType: isVideo ? 'video' : 'photo' });
      }
      const created = await apiRequest<FeedPost>('/api/v1/posts', session.access_token, 'POST', {
        caption: createCaption,
        mediaItems,
        mediaType: createType,
        selectedSound: selectedSoundName,
        pollOptions: [],
        audience: createAudience,
        location: createLocation,
      });
      setCreateCaption('');
      setCreateLocation('');
      setCreateFiles([]);
      setSelectedSoundName(null);
      setCompressionProgress(null);
      setLocationSuggestions([]);
      setLocationSearchState('idle');
      setTab('home');
      setRoomRefresh((value) => value + 1);
      const savings = mediaSavingsMessage(sourceBytes, uploadedBytes);
      setNotice(`Your post is published.${savings ? ` ${savings}` : ''}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Your post could not be published.');
    } finally {
      setCompressionProgress(null);
    }
  };

  const signOut = async () => {
    setMenuOpen(false);
    const { error: signOutError } = await getBrowserSupabase().auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    } else {
      try {
        const guest = await getBrowserSupabase().auth.signInAnonymously();
        if (guest.data.session) {
          setSession(guest.data.session);
        }
      } catch {
        setSession(null);
      }
      setProfile(null);
      setTab('home');
      setNotice('Signed out. You are now browsing as a guest.');
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Room', icon: HomeIcon },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'anonymous', label: 'Anonymous', icon: MessageCircle },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'meet', label: 'Connect', icon: Users },
  ];
  const mobileTabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Room', icon: HomeIcon },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'anonymous', label: 'Anonymous', icon: MessageCircle },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'meet', label: 'Connect', icon: Users },
  ];

  if (loading) {
    return <main className="boot-screen"><div className="loader" /><span>Loading your space…</span></main>;
  }

  const needsProfile = Boolean(session && !session.user.is_anonymous && !profile && configured);
  if (needsProfile) {
    return (
      <main className="onboarding-shell">
        <OnboardingWizard
          initialName={displayName || signupName || session?.user.user_metadata.display_name || ''}
          onComplete={completeOnboarding}
          onSignOut={() => void signOut()}
        />
      </main>
    );
  }

  const isGuest = Boolean(!session || session.user.is_anonymous || !profile);
  const currentProfile = profile ?? {
    id: session?.user?.id ?? 'guest',
    displayName: 'Guest',
    username: null,
    school: null,
  };

  const goToAuthRoute = (route: typeof authRoute) => {
    setAuthRoute(route);
    setError('');
    setNotice('');
  };

  const renderAuthModal = () => {
    if (!authModalOpen) return null;
    return (
      <div className="native-auth-overlay" role="dialog" aria-modal="true" onClick={() => setAuthModalOpen(false)}>
        <main className="native-auth-shell" data-theme={darkMode ? 'dark' : 'light'} onClick={(e) => e.stopPropagation()}>
          <div className="native-auth-content">
            <header className="native-auth-navigation">
              {authRoute !== 'welcome'
                ? <button aria-label="Go back" className="native-auth-back" onClick={() => goToAuthRoute(authRoute === 'forgot-password' ? 'sign-in' : 'welcome')} type="button">‹</button>
                : <span className="native-auth-back" />}
              <button aria-label="Close" className="native-auth-close" onClick={() => setAuthModalOpen(false)} type="button">×</button>
            </header>
            <Image
              alt="Commonroom"
              className="native-auth-logo"
              height={32}
              priority
              src={darkMode ? '/common-room-full-logo-white.png' : '/common-room-full-logo.png'}
              width={140}
            />
            <h1 className="native-auth-title">
              {authRoute === 'welcome' ? 'Your vibe, your people.' : authRoute === 'sign-up' ? 'Create your account' : authRoute === 'forgot-password' ? 'Reset your password' : 'Log in'}
            </h1>
            <p className="native-auth-subtitle">
              {authRoute === 'welcome' ? 'A shared space for your community.' : 'Connect with your community.'}
            </p>
            {!configured ? (
              <div className="native-auth-setup">
                <ShieldCheck size={19} />
                <span>Connect Supabase to enable real accounts and saved community data. Add the public project URL and publishable key to your Vercel environment variables.</span>
              </div>
            ) : null}
            <section className="native-auth-panel">
              {authRoute === 'welcome' ? (
                <div className="native-auth-actions">
                  <button className="native-auth-primary" disabled={!configured} onClick={() => goToAuthRoute('sign-up')} type="button">Create account with email</button>
                  <button className="native-auth-secondary" disabled={!configured} onClick={() => goToAuthRoute('sign-in')} type="button">Sign in with email</button>
                  <button className="native-auth-secondary" disabled={!configured} onClick={signInWithApple} type="button">Continue with Apple</button>
                  <button className="native-auth-secondary" disabled={!configured} onClick={signInWithGoogle} type="button">Continue with Google</button>
                </div>
              ) : null}
              {authRoute === 'sign-up' ? (
                <form className="native-auth-form" onSubmit={submitAuth}>
                  <label>Full name<input required value={signupName} onChange={(event) => setSignupName(event.target.value)} autoComplete="name" placeholder="Full name" /></label>
                  <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" /></label>
                  <label>Create password<div className="native-auth-password"><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Create password" /><button aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}</button></div></label>
                  {error ? <p className="form-error" role="alert">{error}</p> : null}
                  {notice ? <p className="form-success" role="status">{notice}</p> : null}
                  <button className="native-auth-primary" disabled={!configured} type="submit">Create account</button>
                  <button className="native-auth-text-button" onClick={() => goToAuthRoute('sign-in')} type="button">Already have an account? Sign in</button>
                </form>
              ) : null}
              {authRoute === 'sign-in' ? (
                <div className="native-auth-form">
                  <div aria-label="Sign-in method" className="native-auth-method-toggle" role="group">
                    <button aria-pressed={loginMethod === 'email'} className={loginMethod === 'email' ? 'selected' : ''} onClick={() => setLoginMethod('email')} type="button">Email</button>
                    <button aria-pressed={loginMethod === 'apple'} className={loginMethod === 'apple' ? 'selected' : ''} onClick={() => setLoginMethod('apple')} type="button">Apple</button>
                  </div>
                  {loginMethod === 'email' ? (
                    <form className="native-auth-form" onSubmit={submitAuth}>
                      <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" /></label>
                      <label>Password<div className="native-auth-password"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Password" /><button aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}</button></div></label>
                      {error ? <p className="form-error" role="alert">{error}</p> : null}
                      {notice ? <p className="form-success" role="status">{notice}</p> : null}
                      <button className="native-auth-primary" disabled={!configured} type="submit">Continue</button>
                    </form>
                  ) : (
                    <>
                      <p className="native-auth-subtitle">Continue securely with your Apple account.</p>
                      {error ? <p className="form-error" role="alert">{error}</p> : null}
                      <button className="native-auth-primary" disabled={!configured} onClick={signInWithApple} type="button">Continue with Apple</button>
                    </>
                  )}
                  <button className="native-auth-secondary" disabled={!configured} onClick={signInWithGoogle} type="button">Continue with Google</button>
                  {loginMethod === 'email' ? <button className="native-auth-text-button" onClick={() => goToAuthRoute('forgot-password')} type="button">Forgot password?</button> : null}
                  <button className="native-auth-text-button" onClick={() => goToAuthRoute('sign-up')} type="button">Create an account</button>
                </div>
              ) : null}
              {authRoute === 'forgot-password' ? (
                <form className="native-auth-form" onSubmit={requestPasswordReset}>
                  <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" /></label>
                  {error ? <p className="form-error" role="alert">{error}</p> : null}
                  {notice ? <p className="form-success" role="status">{notice}</p> : null}
                  <button className="native-auth-primary" disabled={!configured} type="submit">Request password reset</button>
                </form>
              ) : null}
            </section>
          </div>
        </main>
      </div>
    );
  };

  return (
    <main className={tab === 'games' ? 'app-shell games-app-shell' : 'app-shell'} data-theme={darkMode ? 'dark' : 'light'}>
      <aside className="sidebar">
        <Brand darkMode={darkMode} />
        <div className="school-switcher">
          <div className="school-avatar">{currentProfile.school?.slice(0, 1) ?? 'C'}</div>
          <div><strong>{currentProfile.school ?? 'All communities'}</strong><span>{isGuest ? 'Browsing as Guest' : 'Your community'}</span></div>
          <ChevronDown size={15} />
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button className={tab === id ? 'nav-link selected' : 'nav-link'} key={id} onClick={() => { setTab(id); setError(''); }}>
              <Icon size={19} strokeWidth={2.2} /><span>{label}</span>
            </button>
          ))}
          <button className={tab === 'profile' ? 'nav-link selected' : 'nav-link'} onClick={() => { if (isGuest) { setAuthRoute('sign-in'); setAuthModalOpen(true); } else { setTab('profile'); } }}>
            <Users size={19} /><span>{isGuest ? 'Sign in / Profile' : 'My profile'}</span>
          </button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-promo">
          <div className="promo-icon"><Compass size={20} /></div>
          <strong>Everything, in one place</strong>
          <p>Catch moments, ask questions, and share what matters.</p>
        </div>
        {isGuest ? (
          <div className="guest-sidebar-action">
            <div className="guest-sidebar-actions">
              <button
                className="primary-button guest-signin-btn"
                onClick={() => { setAuthRoute('sign-in'); setAuthModalOpen(true); }}
                type="button"
              >
                <LogIn size={15} />
                <span>Log in / Sign up</span>
              </button>
              <button
                aria-label="Open menu"
                className="guest-menu-button"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button className="account-row" onClick={() => setMenuOpen((open) => !open)}>
            <span className="profile-avatar">{currentProfile.displayName.slice(0, 1).toUpperCase()}</span>
            <span><strong>{currentProfile.displayName}</strong><small>@{currentProfile.username ?? 'student'}</small></span>
            <MoreHorizontal size={19} />
          </button>
        )}
      </aside>

      <section className="workspace">
        {tab === 'home' ? (
          <header className="mobile-topbar">
            <RoomMobileBrand />
            <div className="mobile-topbar-actions room-topbar-actions">
              <button
                className="icon-button room-topbar-icon room-notifications-button"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setMenuOpen(false);
                }}
                type="button"
              >
                <Bell size={20} strokeWidth={1.8} />
                {notifications.some((n) => !n.read) ? (
                  <span className="notification-dot" />
                ) : null}
              </button>
              <span aria-hidden="true" className="room-topbar-divider" />
              <button
                className="icon-button room-topbar-icon"
                aria-label="Search"
                onClick={() => setSearchModalOpen(true)}
                type="button"
              >
                <Search size={22} strokeWidth={1.8} />
              </button>
              {isGuest ? (
                <button
                  className="guest-login-pill room-login-button"
                  onClick={() => { setAuthRoute('sign-in'); setAuthModalOpen(true); }}
                  type="button"
                >
                  Log in
                </button>
              ) : (
                <button
                  className="mobile-avatar-btn room-account-button"
                  aria-label="Account menu"
                  onClick={() => {
                    setMenuOpen((prev) => !prev);
                    setNotificationsOpen(false);
                  }}
                  type="button"
                >
                  <span className="profile-avatar-circle">
                    {currentProfile.displayName.slice(0, 1).toUpperCase()}
                  </span>
                </button>
              )}
              <button
                className="icon-button room-topbar-icon room-menu-button"
                aria-label="Open menu"
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                type="button"
              >
                <Menu size={24} strokeWidth={2} />
              </button>
            </div>
          </header>
        ) : null}

        <header className="workspace-topbar">
          <div className="workspace-heading">
            <h2>{tabs.find((item) => item.id === tab)?.label ?? (tab === 'games' ? 'Games' : tab === 'profile' ? 'My profile' : 'Connect')}</h2>
          </div>
          <div className="topbar-actions">
            <button className="search-button" onClick={() => setSearchModalOpen(true)} type="button">
              <Search size={16} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button topbar-bell-btn"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              type="button"
            >
              <Bell size={18} />
              {notifications.some((n) => !n.read) ? (
                <span className="notification-dot" />
              ) : null}
            </button>
          </div>
        </header>

        <div className="content-scroll">
          {error ? <div className="feedback error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div> : null}
          {notice ? <div className="feedback success-banner" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div> : null}
          <CommunityAnnouncement />

          {tab === 'home' ? (
            <RoomExperience
              accessToken={session?.access_token ?? ''}
              focusPostId={focusPostId}
              isGuest={isGuest}
              onCreate={() => {
                if (isGuest) {
                  setAuthRoute('sign-up');
                  setAuthModalOpen(true);
                } else {
                  setTab('create');
                }
              }}
              onError={setError}
              onNotice={setNotice}
              onRequireAccount={() => {
                setAuthRoute('sign-in');
                setAuthModalOpen(true);
              }}
              profile={currentProfile}
              refreshToken={roomRefresh}
            />
          ) : null}

          {tab === 'create' ? (
            <section className="standalone-column">
              <div className="page-heading"><div><span className="eyebrow">SHARE WITH YOUR COMMUNITY</span><h1>Create a post</h1></div></div>
              <div aria-label="Post destination" className="segmented-control create-destination-toggle" role="group">
                <button className={createDestination === 'room' ? 'segment selected' : 'segment'} onClick={() => { setCreateDestination('room'); setCreateFiles([]); setSelectedSoundName(null); }} type="button">Room</button>
                <button className={createDestination === 'anonymous' ? 'segment selected' : 'segment'} onClick={() => { setCreateDestination('anonymous'); setCreateType('text'); setCreateFiles([]); setSelectedSoundName(null); }} type="button">Anonymous</button>
              </div>
              {createDestination === 'anonymous' && !anonymousIdentity ? (
                <form className="panel anon-create-identity" onSubmit={(event) => void saveAnonymousIdentity(event)}>
                  <div><span className="anon-create-identity-icon"><ShieldCheck size={18} /></span><div><strong>Choose your Anonymous name</strong><p>This name is separate from your profile and won’t be attached to your post.</p></div></div>
                  <label htmlFor="create-anonymous-name">Anonymous name</label>
                  <input
                    autoComplete="off"
                    id="create-anonymous-name"
                    maxLength={24}
                    minLength={3}
                    onChange={(event) => setAnonymousHandleDraft(event.target.value)}
                    placeholder="Choose a name"
                    required
                    value={anonymousHandleDraft}
                  />
                  <button className="secondary-button" disabled={anonymousIdentitySaving || anonymousIdentityLoading || !session} type="submit">
                    {anonymousIdentitySaving ? 'Saving…' : anonymousIdentityLoading ? 'Checking…' : 'Continue'}
                  </button>
                </form>
              ) : null}
              {isGuest && createDestination === 'room' ? (
                <div className="panel guest-prompt-panel">
                  <ImagePlus size={36} className="guest-prompt-icon" />
                  <h2>Join your campus community</h2>
                  <p>Sign in or create an account to post to Room. You can still publish anonymously.</p>
                  <div className="guest-prompt-buttons">
                    <button
                      className="primary-button"
                      onClick={() => { setAuthRoute('sign-up'); setAuthModalOpen(true); }}
                      type="button"
                    >
                      Create an account
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => { setAuthRoute('sign-in'); setAuthModalOpen(true); }}
                      type="button"
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              ) : (
                <form className={`panel form-panel${createDestination === 'anonymous' ? ' anonymous-create-form' : ''}`} onSubmit={(event) => void publishPost(event)}>
                <div className="segmented-control">
                  {(['photo', 'video', 'text'] as const).map((type) => (
                    <button key={type} type="button" className={createType === type ? 'segment selected' : 'segment'} onClick={() => { setCreateType(type); setCreateFiles([]); setSelectedSoundName(null); setReelEditorOpen(false); setPhotoReelEditorOpen(false); }}>
                      {type === 'video' ? <Video size={15} /> : type === 'photo' ? <ImagePlus size={15} /> : null}{formatPostType(type)}
                    </button>
                  ))}
                </div>
                {createDestination === 'anonymous' ? (
                  <>
                    <div className="anon-create-scope-row">
                      <span>Post to</span>
                      <strong>General</strong>
                      <span>For You is a personalized feed, not a post destination.</span>
                    </div>
                    <label className="anon-create-title">Title (optional)
                      <input maxLength={120} onChange={(event) => setAnonymousTitle(event.target.value)} placeholder="Give it a short title" value={anonymousTitle} />
                    </label>
                  </>
                ) : null}
                {createType === 'photo' || createType === 'video' ? (
                  createFiles.length === 0 ? (
                    <label className="upload-zone">
                      <ImagePlus size={24} />
                      <strong>Choose {createType === 'photo' ? 'photos' : 'a video'}</strong>
                      <span>{createDestination === 'anonymous' ? 'Media is optimized on this device before upload.' : 'Media is optimized on this device before upload.'}</span>
                      <input
                        accept={createType === 'photo' ? 'image/*' : 'video/*'}
                        multiple={createType === 'photo' || createDestination === 'anonymous'}
                        type="file"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          if (createDestination === 'room' && createType === 'photo' && createFiles.length + files.length > 10) {
                            setError('Choose up to 10 photos for a Room post.');
                            event.target.value = '';
                            return;
                          }
                          setCreateFiles(files);
                          setSelectedSoundName(null);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  ) : (
                    <div className="upload-preview-container">
                      <div className="upload-preview-header">
                        <span>{createFiles.length} {createType === 'video' ? 'video' : createFiles.length === 1 ? 'photo' : 'photos'} selected</span>
                        <button
                          type="button"
                          className="upload-clear-all"
                          onClick={() => {
                            setCreateFiles([]);
                            setPreviewFile(null);
                            setSelectedSoundName(null);
                            setReelEditorOpen(false);
                          }}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="upload-preview-grid">
                        {createFiles.map((file, index) => {
                          const isVideo = file.type.startsWith('video/');
                          const url = createPreviewUrls[index];
                          return (
                            <div key={`${file.name}-${index}`} className="upload-thumbnail-card">
                              <button
                                type="button"
                                className="upload-thumbnail-btn"
                                onClick={() => setPreviewFile({ url, file, isVideo })}
                                aria-label={`View full size ${file.name}`}
                                title="Click to view full size"
                              >
                                {isVideo ? (
                                  <video src={url} className="upload-thumb-media" />
                                ) : (
                                  <img src={url} alt={file.name} className="upload-thumb-media" />
                                )}
                                {isVideo ? (
                                  <span className="video-pill">
                                    <Play size={9} fill="currentColor" /> Video
                                  </span>
                                ) : null}
                              </button>
                              <button
                                type="button"
                                className="upload-thumb-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreateFiles((prev) => prev.filter((_, i) => i !== index));
                                  setSelectedSoundName(null);
                                  if (previewFile?.file === file) setPreviewFile(null);
                                }}
                                aria-label="Remove media"
                                title="Remove photo"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {createType === 'photo' && (createDestination === 'anonymous' || createFiles.length < 10) ? (
                          <label className="upload-add-more" aria-label="Add more photos" title="Add more photos">
                            <Plus size={20} />
                            <span>Add more</span>
                            <input
                              accept="image/*"
                              multiple
                              type="file"
                              onChange={(event) => {
                                const additional = Array.from(event.target.files ?? []);
                                setCreateFiles((prev) => createDestination === 'anonymous'
                                  ? [...prev, ...additional]
                                  : [...prev, ...additional].slice(0, 10));
                                event.target.value = '';
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                      {createType === 'video' && createFiles.length === 1 && createFiles[0] ? (
                        <div className="reel-editor-entry">
                          <div><strong>{selectedSoundName ? 'Edited reel ready' : 'Make it a reel'}</strong><span>{selectedSoundName ? `Soundtrack: ${selectedSoundName}` : 'Trim your clip and add your own audio.'}</span></div>
                          <button className="secondary-button" onClick={() => setReelEditorOpen(true)} type="button"><Video size={15} /> Open editor</button>
                        </div>
                      ) : null}
                      {createType === 'photo' && createFiles.length > 0 ? (
                        <div className="reel-editor-entry">
                          <div><strong>Turn photos into a video</strong><span>Arrange the sequence, choose timing, and optionally add your own soundtrack.</span></div>
                          <button className="secondary-button" onClick={() => setPhotoReelEditorOpen(true)} type="button"><Video size={15} /> Make a reel</button>
                        </div>
                      ) : null}
                    </div>
                  )
                ) : null}
                {createDestination === 'anonymous' && createType === 'text' ? (
                  <>
                    <div aria-label="Text card style" className="create-text-template-grid" role="group">
                      {anonymousTextTemplates.map((template) => (
                        <button
                          aria-pressed={anonymousTemplate === template.id}
                          className={anonymousTemplate === template.id ? 'create-text-template selected' : 'create-text-template'}
                          key={template.id}
                          onClick={() => setAnonymousTemplate(template.id)}
                          style={{ background: template.background }}
                          type="button"
                        >
                          <span>{template.name}</span>
                          <strong>Your words, your style</strong>
                        </button>
                      ))}
                    </div>
                    <div
                      aria-label="Text card preview"
                      className={`create-text-card-preview ${anonymousTextTemplates.find((template) => template.id === anonymousTemplate)?.className ?? ''}`}
                      style={{ background: anonymousTextTemplates.find((template) => template.id === anonymousTemplate)?.background }}
                    >
                      {createCaption.trim() || 'Your words will appear here'}
                    </div>
                  </>
                ) : null}
                <label>{createDestination === 'anonymous' ? 'Your post' : 'Caption'}<textarea value={createCaption} onChange={(event) => setCreateCaption(event.target.value)} maxLength={3000} rows={4} placeholder={createDestination === 'anonymous' ? 'What would you like to say?' : 'What would you like to share?'} /></label>
                {createDestination === 'room' ? <div className="form-grid">
                  <div className="create-location-field">
                    <label htmlFor="create-location">Location (optional)</label>
                    <input
                      autoComplete="off"
                      id="create-location"
                      maxLength={120}
                      onChange={(event) => {
                        setCreateLocation(event.target.value);
                        setLocationSuggestions([]);
                        setLocationSearchState('idle');
                        setError('');
                      }}
                      placeholder="Search for a place or type a location"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={locationSuggestions.length > 0}
                      aria-controls="create-location-suggestions"
                      value={createLocation}
                    />
                    {locationSuggestions.length > 0 ? (
                      <ul className="create-location-suggestions" id="create-location-suggestions" role="listbox">
                        {locationSuggestions.map((suggestion) => (
                          <li key={suggestion.id} role="option" aria-selected="false">
                            <button
                              onClick={() => {
                                setCreateLocation(suggestion.label);
                                setLocationSuggestions([]);
                                setLocationSearchState('idle');
                              }}
                              type="button"
                            >
                              <strong>{suggestion.name}</strong>
                              {suggestion.detail ? <span>{suggestion.detail}</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {locationSearchState === 'loading' ? <small className="create-location-status" role="status">Searching locations…</small> : null}
                    {locationSearchState === 'error' ? <small className="create-location-status" role="status">Suggestions are unavailable. Your typed location can still be posted.</small> : null}
                    {locationSearchState === 'ready' && createLocation.trim().length >= 2 && locationSuggestions.length === 0 ? <small className="create-location-status" role="status">No matching places. Your typed location can still be posted.</small> : null}
                    <small className="create-location-attribution">Location results by <a href="https://github.com/komoot/photon" rel="noreferrer" target="_blank">Photon</a> · © OpenStreetMap contributors</small>
                  </div>
                  <label>Audience<select value={createAudience} onChange={(event) => setCreateAudience(event.target.value as Audience)}><option>Public</option><option>Followers</option><option>Private</option></select></label>
                </div> : null}
                {compressionProgress !== null ? <p className="media-compression-status" role="status">Optimizing media on this device… {compressionProgress}%</p> : null}
                <div className="form-footnote"><ShieldCheck size={16} /><span>{createDestination === 'anonymous' ? 'Not linked.' : 'Audience permissions are enforced by the API and database policies.'}</span></div>
                <button className="primary-button anonymous-post-submit" disabled={compressionProgress !== null || (createDestination === 'anonymous' && (!anonymousIdentity || anonymousIdentityLoading))} type="submit">{compressionProgress !== null ? 'Optimizing…' : createDestination === 'anonymous' ? 'Post anonymously' : 'Post'}</button>
              </form>
            )}
          </section>
        ) : null}

          {previewFile ? (
            <div
              className="media-lightbox-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Media Preview"
              onClick={() => setPreviewFile(null)}
            >
              <div
                className="media-lightbox-box"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="media-lightbox-header">
                  <span className="media-lightbox-title">{previewFile.file.name}</span>
                  <button
                    className="media-lightbox-close"
                    onClick={() => setPreviewFile(null)}
                    aria-label="Close full size view"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="media-lightbox-body">
                  {previewFile.isVideo ? (
                    <video
                      autoPlay
                      controls
                      playsInline
                      src={previewFile.url}
                      className="media-lightbox-media"
                    />
                  ) : (
                    <img
                      alt={previewFile.file.name}
                      src={previewFile.url}
                      className="media-lightbox-media"
                    />
                  )}
                </div>
                <footer className="media-lightbox-footer">
                  <span>{(previewFile.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <button
                    className="media-lightbox-remove-btn"
                    type="button"
                    onClick={() => {
                      setCreateFiles((prev) => prev.filter((f) => f !== previewFile.file));
                      setSelectedSoundName(null);
                      setPreviewFile(null);
                    }}
                  >
                    Remove this photo
                  </button>
                </footer>
              </div>
            </div>
          ) : null}

          {reelEditorOpen && createType === 'video' && createFiles[0] ? (
            <ReelEditor
              file={createFiles[0]}
              onClose={() => setReelEditorOpen(false)}
              onExport={(editedFile, soundName) => {
                setCreateFiles([editedFile]);
                setSelectedSoundName(soundName);
                setReelEditorOpen(false);
              }}
            />
          ) : null}

          {photoReelEditorOpen && createType === 'photo' && createFiles.length > 0 ? (
            <PhotoReelEditor
              files={createFiles}
              onClose={() => setPhotoReelEditorOpen(false)}
              onExport={(editedFile, soundName) => {
                setCreateFiles([editedFile]);
                setCreateType('video');
                setSelectedSoundName(soundName);
                setPhotoReelEditorOpen(false);
              }}
            />
          ) : null}

          {tab === 'anonymous' ? (
            <AnonymousExperience
              initialPostId={anonymousFocusPostId ?? undefined}
              initialSession={session}
              onBack={() => {
                setAnonymousFocusPostId(null);
                setTab('home');
              }}
              onCreateAnonymous={() => {
                setCreateDestination('anonymous');
                setCreateType('text');
                setCreateFiles([]);
                setSelectedSoundName(null);
                setTab('create');
              }}
              onRequireAccount={() => {
                setAuthRoute('sign-in');
                setAuthModalOpen(true);
              }}
            />
          ) : null}

          {tab === 'marketplace' ? (
            <MarketplaceExperience />
          ) : null}

          {tab === 'games' ? (
            <GamesExperience
              accessToken={session?.access_token ?? ''}
              playerId={currentProfile.id}
              playerName={currentProfile.displayName}
            />
          ) : null}

          {tab === 'meet' ? (
            <MeetExperience
              onRequireAccount={() => {
                setAuthRoute('sign-in');
                setAuthModalOpen(true);
              }}
              profile={currentProfile}
              session={session && profile && !session.user.is_anonymous ? session : null}
            />
          ) : null}

          {tab === 'profile' ? (
            <section className="standalone-column">
              <div className="page-heading">
                <div><span className="eyebrow">YOUR ACCOUNT</span><h1>{isGuest ? 'Join Commonroom' : 'My profile'}</h1></div>
                <button
                  aria-label="Close profile"
                  className="icon-button profile-close-button"
                  onClick={() => { setError(''); setTab('home'); }}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
              {isGuest ? (
                <div className="panel guest-prompt-panel">
                  <UserPlus size={36} className="guest-prompt-icon" />
                  <h2>Create your student profile</h2>
                  <p>Sign up to connect with your school community, bookmark posts, sell items, and build your profile.</p>
                  <div className="guest-prompt-buttons">
                    <button
                      className="primary-button"
                      onClick={() => { setAuthRoute('sign-up'); setAuthModalOpen(true); }}
                      type="button"
                    >
                      Create an account
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => { setAuthRoute('sign-in'); setAuthModalOpen(true); }}
                      type="button"
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ProfileForm
                    ageConfirmed={ageConfirmed}
                    course={course}
                    displayName={displayName}
                    educationStatus={educationStatus}
                    filteredInstitutions={filteredInstitutions}
                    interests={interests}
                    school={school}
                    schoolSearch={schoolSearch}
                    showSchool={showSchool}
                    year={year}
                    onAgeConfirmed={setAgeConfirmed}
                    onCourse={setCourse}
                    onDisplayName={setDisplayName}
                    onEducationStatus={setEducationStatus}
                    onInterest={toggleInterest}
                    onSchool={setSchool}
                    onSchoolSearch={setSchoolSearch}
                    onShowSchool={setShowSchool}
                    onSubmit={saveProfile}
                    onYear={setYear}
                    error={error}
                    disabled={!configured}
                  />
                  <button className="secondary-button signout-button" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
                </>
              )}
            </section>
          ) : null}
        </div>

        {menuOpen ? (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="account-menu">
              <div className="account-menu-header">
                <span className="profile-avatar">{currentProfile.displayName.slice(0, 1).toUpperCase()}</span>
                <div className="account-menu-user">
                  <strong>{currentProfile.displayName}</strong>
                  <small>{currentProfile.school ?? 'Commonroom'}</small>
                </div>
                <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu" type="button">
                  <X size={16} />
                </button>
              </div>
              <div className="account-menu-list">
                <button onClick={() => { setTab('profile'); setMenuOpen(false); }} type="button">
                  <Users size={16} /> My profile
                </button>
                <button onClick={() => { setTab('meet'); setMenuOpen(false); }} type="button">
                  <Heart size={16} /> Connect
                </button>
                <button onClick={() => { setTab('create'); setMenuOpen(false); }} type="button">
                  <Plus size={16} /> Create post
                </button>
                <button onClick={() => { setTab('games'); setMenuOpen(false); }} type="button">
                  <Dices size={16} /> Games
                </button>
                <div className="account-menu-divider" />
                <button className="account-menu-signout" onClick={() => void signOut()} type="button">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          </>
        ) : null}

        {notificationsOpen ? (
          <>
            <div className="menu-backdrop" onClick={() => setNotificationsOpen(false)} />
            <div className="notifications-dropdown" role="dialog" aria-label="Notifications">
              <div className="notifications-header">
                <div className="notifications-heading">
                  <Bell size={16} />
                  <strong>Notifications</strong>
                  {notifications.filter((n) => !n.read).length > 0 ? (
                    <span className="unread-pill">{notifications.filter((n) => !n.read).length} new</span>
                  ) : null}
                </div>
                <button
                  className="notifications-mark-read"
                  onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                  type="button"
                >
                  Mark all read
                </button>
              </div>
              <div className="notifications-list">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-item ${item.read ? 'read' : 'unread'}`}
                    onClick={() => {
                      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
                      setNotificationsOpen(false);
                      setTab('home');
                    }}
                  >
                    <div className={`notification-icon-wrap ${item.type}`}>
                      {item.type === 'like' ? <Heart size={13} fill="currentColor" /> : item.type === 'comment' ? <MessageCircle size={13} fill="currentColor" /> : item.type === 'follow' ? <UserPlus size={13} /> : <Bell size={13} />}
                    </div>
                    <div className="notification-content">
                      <p><strong>{item.actor}</strong> {item.text}</p>
                      <span className="notification-time">{item.time}</span>
                    </div>
                    {!item.read ? <span className="notification-dot-inline" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {searchModalOpen ? (
          <div className="search-modal-backdrop" onClick={() => setSearchModalOpen(false)}>
            <div className="search-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="search-modal-input-row">
                <Search size={18} className="search-modal-icon" />
                <input
                  autoFocus
                  className="search-modal-input"
                  placeholder="Search students, posts, schools, #topics…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button className="search-modal-clear" onClick={() => setSearchQuery('')} aria-label="Clear search" type="button">
                    <X size={15} />
                  </button>
                ) : null}
                <button className="search-modal-close" onClick={() => setSearchModalOpen(false)} type="button">
                  Close
                </button>
              </div>

              <div className="search-modal-tags">
                <span className="search-tags-label">Trending now:</span>
                {['#Vibes', '#StudyTips', '#ExamSeason', '#HostelLife', '#TechStudents', '#GlowUp'].map((tag) => (
                  <button
                    key={tag}
                    className="search-tag-chip"
                    onClick={() => setSearchQuery(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="search-modal-results">
                {searchQuery.trim() ? (
                  <>
                    <div className="search-section-title">Communities</div>
                    {institutions
                      .filter((inst) => `${inst.name} ${inst.location}`.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 4)
                      .map((inst) => (
                        <div key={inst.name} className="search-result-item" onClick={() => setSearchModalOpen(false)}>
                          <div className="search-result-avatar">{inst.name.slice(0, 1)}</div>
                          <div className="search-result-text">
                            <strong>{inst.name}</strong>
                            <span>{inst.location}</span>
                          </div>
                        </div>
                      ))}
                    <div className="search-section-title">Students</div>
                    {['Joyce A. (@real_joyce) - Ahmadu Bello University', 'Mide B. (@mide_b) - University of Lagos', 'Nana Q. (@nana_q) - FUT Minna', 'Chidi Eze (@chidi_tech) - UNN Nsukka']
                      .filter((person) => person.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((person) => (
                        <div key={person} className="search-result-item" onClick={() => { setSearchModalOpen(false); setTab('home'); }}>
                          <div className="search-result-avatar person">{person.slice(0, 1)}</div>
                          <div className="search-result-text">
                            <strong>{person.split(' - ')[0]}</strong>
                            <span>{person.split(' - ')[1]}</span>
                          </div>
                        </div>
                      ))}
                  </>
                ) : (
                  <div className="search-empty-prompt">
                    <p>Type names, tags, or topics to search your community.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileTabs.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={tab === id ? 'page' : undefined}
            aria-label={label}
            className={`mobile-nav-item${tab === id ? ' active' : ''}${id === 'anonymous' ? ' mobile-nav-anonymous' : ''}`}
            key={id}
            onClick={() => setTab(id)}
            type="button"
          >
            {id === 'anonymous' ? (
              <div className="mobile-nav-anonymous-wrap">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="mobile-nav-mask"
                  height={62}
                  priority
                  src="/anonymous-shushing-mask.png"
                  width={62}
                />
                <svg className="mobile-nav-curved-text" viewBox="0 0 100 100" aria-hidden="true">
                  <path id="mobile-nav-anon-arc" d="M 13 63 A 44 44 0 0 0 87 63" fill="none" />
                  <text>
                    <textPath href="#mobile-nav-anon-arc" startOffset="50%" textAnchor="middle">
                      ANONYMOUS
                    </textPath>
                  </text>
                </svg>
              </div>
            ) : (
              <>
                <span className="mobile-nav-icon-wrap">
                  <Icon size={id === 'create' ? 25 : 27} strokeWidth={1.8} />
                </span>
                <span>{label}</span>
              </>
            )}
          </button>
        ))}
      </nav>
      {renderAuthModal()}
    </main>
  );
}

function Brand({ darkMode = true }: { darkMode?: boolean }) {
  return (
    <a href="/" className="brand-link" aria-label="Commonroom home">
      <Image
        alt="Commonroom"
        className="brand-logo"
        height={28}
        priority
        src={darkMode ? '/common-room-full-logo-white.png' : '/common-room-full-logo.png'}
        width={132}
      />
    </a>
  );
}

function RoomMobileBrand() {
  return (
    <a aria-label="Commonroom home" className="room-mobile-brand" href="/">
      CommonRoom
    </a>
  );
}

function ProfileForm({
  ageConfirmed,
  course,
  displayName,
  educationStatus,
  filteredInstitutions,
  interests,
  school,
  schoolSearch,
  showSchool,
  year,
  onAgeConfirmed,
  onCourse,
  onDisplayName,
  onEducationStatus,
  onInterest,
  onSchool,
  onSchoolSearch,
  onShowSchool,
  onSubmit,
  onYear,
  error,
  disabled,
}: {
  ageConfirmed: boolean;
  course: string;
  displayName: string;
  educationStatus: OnboardingProfile['educationStatus'];
  filteredInstitutions: typeof institutions;
  interests: string[];
  school: string;
  schoolSearch: string;
  showSchool: boolean;
  year: string;
  onAgeConfirmed: (value: boolean) => void;
  onCourse: (value: string) => void;
  onDisplayName: (value: string) => void;
  onEducationStatus: (value: OnboardingProfile['educationStatus']) => void;
  onInterest: (value: string) => void;
  onSchool: (value: string) => void;
  onSchoolSearch: (value: string) => void;
  onShowSchool: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onYear: (value: string) => void;
  error: string;
  disabled: boolean;
}) {
  const interestOptions = ['Social life', 'Technology', 'Music', 'Sports', 'Gaming', 'Entrepreneurship', 'Arts', 'Study tips'];

  return (
    <form className="panel profile-form" onSubmit={onSubmit}>
      <label>Education status<select value={educationStatus} onChange={(event) => onEducationStatus(event.target.value as OnboardingProfile['educationStatus'])}><option value="currently_in_school">Currently in school</option><option value="not_in_school_yet">Not in school yet</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
      {educationStatus === 'currently_in_school' ? (
        <label>School
          <input value={schoolSearch} onChange={(event) => { onSchoolSearch(event.target.value); onSchool(''); }} placeholder={school || 'Search Nigerian institutions'} />
          {schoolSearch ? <span className="school-results">{filteredInstitutions.map((item) => <button key={item.id} type="button" onClick={() => { onSchool(item.name); onSchoolSearch(''); }}>{item.name}<small>{item.location}</small></button>)}</span> : null}
          {school ? <span className="selected-school">Selected: {school}</span> : null}
        </label>
      ) : null}
      <label>Display name<input required maxLength={80} value={displayName} onChange={(event) => onDisplayName(event.target.value)} placeholder="What should people call you?" /></label>
      <div className="form-grid"><label>Course (optional)<input maxLength={80} value={course} onChange={(event) => onCourse(event.target.value)} /></label><label>Year of study (optional)<input maxLength={40} value={year} onChange={(event) => onYear(event.target.value)} /></label></div>
      <label className="check-row"><input checked={showSchool} onChange={(event) => onShowSchool(event.target.checked)} type="checkbox" /><span>Show my school on my public posts</span></label>
      <label className="check-row"><input checked={ageConfirmed} onChange={(event) => onAgeConfirmed(event.target.checked)} type="checkbox" /><span>I confirm that I meet the app’s minimum age requirement.</span></label>
      <div className="interest-picker"><span className="field-label">Interests</span><div>{interestOptions.map((interest) => <button className={interests.includes(interest) ? 'interest-chip selected' : 'interest-chip'} key={interest} onClick={() => onInterest(interest)} type="button">{interest}</button>)}</div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={disabled} type="submit">Save profile</button>
    </form>
  );
}
