'use client';

import {
  Bell,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  LogOut,
  MessageCircle,
  Moon,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AnonymousExperience } from '@/components/AnonymousExperience';
import { CommunityAnnouncement } from '@/components/CommunityAnnouncement';
import { MarketplaceExperience } from '@/components/MarketplaceExperience';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { PhotoReelEditor } from '@/components/PhotoReelEditor';
import { ProfileExperience } from '@/components/ProfileExperience';
import { RoomExperience } from '@/components/RoomExperience';
import { ReelEditor } from '@/components/ReelEditor';
import { MediaUploadQueue } from '@/components/cr/MediaUploadQueue';
import {
  Banner,
  BottomNav,
  Button as CRButton,
  DotsProgress,
  Header as CRHeader,
  Input as CRInput,
  type BottomNavItemLabel,
} from '@/components/cr/primitives';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Audience, FeedPost, MediaItem, MediaType, OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';
import { compressMedia } from '@/lib/media-compression';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

const appTabValues = ['home', 'room', 'create', 'anonymous', 'marketplace', 'profile'] as const;
type AppTab = (typeof appTabValues)[number];

function isAppTab(value: string | null): value is AppTab {
  return appTabValues.some((tab) => tab === value);
}
type ProfileRecord = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
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
  avatar_url?: string | null;
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
type PersonSearchResult = {
  id: string;
  display_name: string;
  username: string | null;
  school: string | null;
  avatar_url: string | null;
};
type PersonProfileResult = PersonSearchResult & {
  bio: string;
  following: boolean;
  follower_count: number;
  interests: string[];
  posts: FeedPost[];
};
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

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('commonroom:recent-searches');
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : [];
  } catch (storageError) {
    console.warn('Recent searches could not be loaded.', storageError);
    return [];
  }
}

function formatPostType(type: Extract<MediaType, 'photo' | 'video' | 'text' | 'poll'>) {
  if (type === 'poll') return 'Poll';
  return type === 'video' ? 'Video' : type === 'photo' ? 'Photo' : 'Text';
}

export default function Home() {
  const pathname = usePathname();
  const focusPostId = pathname?.startsWith('/posts/') ? pathname.split('/')[2] ?? null : null;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [tab, setTabState] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const requested = new URLSearchParams(window.location.search).get('tab');
      if (requested !== null) return isAppTab(requested) ? requested : 'home';
      const saved = sessionStorage.getItem('commonroom_active_tab');
      if (isAppTab(saved)) return saved;
      if (saved !== null) sessionStorage.removeItem('commonroom_active_tab');
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
  const [authRoute, setAuthRoute] = useState<'welcome' | 'sign-in' | 'sign-up' | 'verify-email' | 'forgot-password' | 'update-password'>('welcome');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [configured] = useState(() => isSupabaseConfigured());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [signupName, setSignupName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [educationStatus, setEducationStatus] = useState<OnboardingProfile['educationStatus']>('currently_in_school');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [school, setSchool] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarError, setProfileAvatarError] = useState('');
  const [profileAvatarRemoved, setProfileAvatarRemoved] = useState(false);
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [showSchool, setShowSchool] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [createType, setCreateType] = useState<MediaType>('photo');
  const [createPollOptions, setCreatePollOptions] = useState<string[]>(['', '']);
  const [createDestination, setCreateDestination] = useState<'room' | 'anonymous'>('room');
  const [anonymousTitle, setAnonymousTitle] = useState('');
  const [anonymousIdentity, setAnonymousIdentity] = useState<AnonymousIdentity | null>(null);
  const [anonymousHandleDraft, setAnonymousHandleDraft] = useState('');
  const [anonymousIdentitySessionId, setAnonymousIdentitySessionId] = useState<string | null>(null);
  const [anonymousIdentitySaving, setAnonymousIdentitySaving] = useState(false);
  const [anonymousTemplate, setAnonymousTemplate] = useState<(typeof anonymousTextTemplates)[number]['id']>('blue-hour');
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const createFormRef = useRef<HTMLFormElement | null>(null);
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
  const [peopleResults, setPeopleResults] = useState<PersonSearchResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [searchRetry, setSearchRetry] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [selectedPerson, setSelectedPerson] = useState<PersonProfileResult | null>(null);
  const [personProfileLoading, setPersonProfileLoading] = useState(false);
  const [personProfileError, setPersonProfileError] = useState('');
  const personProfileRequest = useRef(0);

  const configuredNow = isSupabaseConfigured();
  const anonymousIdentityLoading = createDestination === 'anonymous'
    && Boolean(session)
    && anonymousIdentitySessionId !== session?.user.id;
  const createPreviewUrls = useMemo(() => createFiles.map((file) => URL.createObjectURL(file)), [createFiles]);
  const profileAvatarPreview = useMemo(
    () => profileAvatarFile ? URL.createObjectURL(profileAvatarFile) : null,
    [profileAvatarFile],
  );

  useEffect(() => () => {
    createPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [createPreviewUrls]);

  useEffect(() => () => {
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
  }, [profileAvatarPreview]);

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
    const query = searchQuery.trim();
    if (!searchModalOpen || query.length < 2 || !session || session.user.is_anonymous) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearchState('loading');
      void apiRequest<PersonSearchResult[]>(
        `/api/v1/people?q=${encodeURIComponent(query)}`,
        session.access_token,
      ).then((results) => {
        if (!active) return;
        setPeopleResults(results);
        setSearchState('ready');
      }).catch((searchError: unknown) => {
        if (!active) return;
        console.error('People search failed.', searchError);
        setPeopleResults([]);
        setSearchState('error');
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchModalOpen, searchQuery, searchRetry, session]);

  const rememberSearch = (value: string) => {
    const query = value.trim();
    if (!query) return;
    const recent = [query, ...recentSearches.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 6);
    setRecentSearches(recent);
    try {
      window.localStorage.setItem('commonroom:recent-searches', JSON.stringify(recent));
    } catch (storageError) {
      console.warn('Recent search could not be saved.', storageError);
    }
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPeopleResults([]);
    setSearchState('idle');
  };

  const openPersonProfile = async (personId: string) => {
    if (!session || session.user.is_anonymous) {
      setAuthRoute('sign-in');
      setAuthModalOpen(true);
      return;
    }
    const requestId = ++personProfileRequest.current;
    setPersonProfileLoading(true);
    setPersonProfileError('');
    setSelectedPerson(null);
    try {
      const person = await apiRequest<PersonProfileResult>(`/api/v1/people/${encodeURIComponent(personId)}`, session.access_token);
      if (requestId !== personProfileRequest.current) return;
      setSelectedPerson(person);
    } catch (profileError) {
      if (requestId !== personProfileRequest.current) return;
      setPersonProfileError(profileError instanceof Error ? profileError.message : 'This profile could not be loaded.');
    } finally {
      if (requestId === personProfileRequest.current) setPersonProfileLoading(false);
    }
  };

  const closePersonProfile = () => {
    personProfileRequest.current += 1;
    setPersonProfileLoading(false);
    setSelectedPerson(null);
    setPersonProfileError('');
  };

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
        avatarUrl: record.avatar_url ?? null,
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
    if (!configuredNow) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setError('');
      if (event === 'PASSWORD_RECOVERY') {
        setAuthRoute('update-password');
        setAuthModalOpen(true);
        return;
      }
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
          setAuthRoute('verify-email');
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

  const resendSignupConfirmation = async () => {
    setError('');
    setNotice('');
    try {
      const { error: resendError } = await getBrowserSupabase().auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setNotice('A new confirmation email has been sent.');
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'The confirmation email could not be resent.');
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const { error: updateError } = await getBrowserSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmPassword('');
      setAuthModalOpen(false);
      setNotice('Your password has been updated.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Your password could not be updated.');
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
    let uploadedAvatarPath: string | null = null;
    try {
      let avatarUrl = profileAvatarRemoved ? null : profile?.avatarUrl ?? null;
      if (profileAvatarFile) {
        const path = `${session.user.id}/profile-${crypto.randomUUID()}.${mediaFileExtension(profileAvatarFile)}`;
        const { data, error: uploadError } = await getBrowserSupabase().storage.from('post-media').upload(path, profileAvatarFile, {
          contentType: profileAvatarFile.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedAvatarPath = data.path;
        avatarUrl = getBrowserSupabase().storage.from('post-media').getPublicUrl(data.path).data.publicUrl;
      }
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', session.access_token, 'PUT', {
        educationStatus,
        school: educationStatus === 'currently_in_school' ? school : null,
        showSchoolOnProfile: showSchool,
        displayName,
        course,
        year,
        ageEligibilityConfirmed: ageConfirmed,
        interests,
        avatarUrl,
      });
      setProfile({
        id: saved.id,
        displayName: saved.display_name,
        username: saved.username,
        avatarUrl: saved.avatar_url ?? avatarUrl,
        educationStatus: saved.education_status,
        school: saved.school,
        showSchoolOnProfile: saved.show_school_on_profile,
        course: saved.course,
        year: saved.year,
        ageEligibilityConfirmed: saved.age_eligibility_confirmed,
        interests: saved.interests,
      });
      setProfileAvatarFile(null);
      setProfileAvatarError('');
      setProfileAvatarRemoved(false);
      setTab('home');
      setNotice('Your profile is saved.');
    } catch (saveError) {
      if (uploadedAvatarPath) {
        const { error: cleanupError } = await getBrowserSupabase().storage.from('post-media').remove([uploadedAvatarPath]);
        if (cleanupError) setProfileAvatarError('The profile could not be saved and the uploaded photo could not be removed.');
      }
      setError(saveError instanceof Error ? saveError.message : 'Your profile could not be saved.');
    }
  };

  const selectProfileAvatar = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileAvatarError('This file type isn’t supported. Use a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileAvatarError('Choose a photo smaller than 10 MB.');
      return;
    }
    setProfileAvatarFile(file);
    setProfileAvatarError('');
    setProfileAvatarRemoved(false);
    setError('');
  };

  const completeOnboarding = async (profileDraft: OnboardingProfile, avatarFile?: File | null) => {
    if (!session) throw new Error('Your session expired. Sign in again to finish setting up your profile.');
    let uploadedAvatarPath: string | null = null;
    let avatarUrl: string | null = null;
    try {
      if (avatarFile) {
        const path = `${session.user.id}/profile-${crypto.randomUUID()}.${mediaFileExtension(avatarFile)}`;
        const { data, error: uploadError } = await getBrowserSupabase().storage.from('post-media').upload(path, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedAvatarPath = data.path;
        avatarUrl = getBrowserSupabase().storage.from('post-media').getPublicUrl(data.path).data.publicUrl;
      }
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', session.access_token, 'PUT', {
        ...profileDraft,
        avatarUrl,
      });
    const savedProfile: ProfileRecord = {
      id: saved.id,
      displayName: saved.display_name,
      username: saved.username,
      avatarUrl: saved.avatar_url ?? avatarUrl,
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
    } catch (onboardingError) {
      if (uploadedAvatarPath) {
        const { error: cleanupError } = await getBrowserSupabase().storage.from('post-media').remove([uploadedAvatarPath]);
        if (cleanupError) console.error('Unable to remove profile photo after onboarding failed.', cleanupError);
      }
      throw onboardingError;
    }
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

  const selectCreateFiles = (selectedFiles: File[], append = false) => {
    const nextFiles = append ? [...createFiles, ...selectedFiles] : selectedFiles;
    const maxFiles = createDestination === 'room' && createType === 'photo' ? 10 : null;
    if (maxFiles !== null && nextFiles.length > maxFiles) {
      const message = `Choose up to ${maxFiles} photos for a Room post.`;
      setUploadError(message);
      setError(message);
      return;
    }

    const hasWrongType = nextFiles.some((file) => (
      createType === 'photo' ? !file.type.startsWith('image/') : !file.type.startsWith('video/')
    ));
    const hasUnsupportedType = nextFiles.some((file) => !mediaFileExtension(file));
    if (hasWrongType || hasUnsupportedType) {
      const message = hasUnsupportedType
        ? 'This file type isn’t supported. Use a JPG, PNG, WebP, MP4, MOV, or WebM file.'
        : `Choose ${createType === 'photo' ? 'photo' : 'video'} files for this post.`;
      setUploadError(message);
      setError(message);
      return;
    }

    setCreateFiles(nextFiles);
    setUploadError('');
    setError('');
    setSelectedSoundName(null);
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
        setCompressionProgress(Math.round(((index + 0.6) / createFiles.length) * 100));
        const { error: uploadError } = await storage.upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        setCompressionProgress(Math.round(((index + 0.95) / createFiles.length) * 100));
        mediaItems.push({ path, mediaType: file.type.startsWith('video/') ? 'video' : 'photo' });
      }
      setCompressionProgress(99);
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
      setUploadError('');
      setSelectedSoundName(null);
      setCompressionProgress(null);
      setAnonymousFocusPostId(created.id);
      setTab('anonymous');
      const savings = mediaSavingsMessage(sourceBytes, uploadedBytes);
      setNotice(`Your post is live in the Anonymous Feed.${savings ? ` ${savings}` : ''}`);
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : 'Your anonymous post could not be published.';
      setUploadError(message);
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
      setIsPublishing(true);
      setUploadError('');
      try {
        await publishAnonymousPost();
      } finally {
        setIsPublishing(false);
      }
      return;
    }
    setError('');
    setNotice('');
    setUploadError('');
    setIsPublishing(true);
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
        setCompressionProgress(Math.round(((index + 0.6) / createFiles.length) * 100));
        const { data, error: uploadError } = await supabase.storage.from('post-media').upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        setCompressionProgress(Math.round(((index + 0.95) / createFiles.length) * 100));
        const { data: publicUrl } = supabase.storage.from('post-media').getPublicUrl(data.path);
        mediaItems.push({ uri: publicUrl.publicUrl, mediaType: isVideo ? 'video' : 'photo' });
      }
      setCompressionProgress(99);
      const created = await apiRequest<FeedPost>('/api/v1/posts', session.access_token, 'POST', {
        caption: createCaption,
        mediaItems,
        mediaType: createType,
        selectedSound: selectedSoundName,
        pollOptions: createType === 'poll' ? createPollOptions.map((o) => o.trim()).filter(Boolean) : [],
        audience: createAudience,
        location: createLocation,
      });
      setCreateCaption('');
      setCreateLocation('');
      setCreateFiles([]);
      setUploadError('');
      setSelectedSoundName(null);
      setCreatePollOptions(['', '']);
      setCompressionProgress(null);
      setLocationSuggestions([]);
      setLocationSearchState('idle');
      setTab('home');
      setRoomRefresh((value) => value + 1);
      const savings = mediaSavingsMessage(sourceBytes, uploadedBytes);
      setNotice(`Your post is published.${savings ? ` ${savings}` : ''}`);
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : 'Your post could not be published.';
      setUploadError(message);
      setError(message);
    } finally {
      setCompressionProgress(null);
      setIsPublishing(false);
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

  if (loading) {
    return <main className="boot-screen"><div className="loader" /><span>Loading your space…</span></main>;
  }

  const needsProfile = Boolean(session && !session.user.is_anonymous && !profile && configured && authRoute !== 'update-password');
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
    avatarUrl: null,
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
        <main className="native-auth-shell" data-auth-route={authRoute} onClick={(e) => e.stopPropagation()}>
          <div className="native-auth-content">
            <CRHeader className="native-auth-navigation">
              {authRoute !== 'welcome'
                ? <button aria-label="Go back" className="native-auth-back" onClick={() => goToAuthRoute(authRoute === 'forgot-password' || authRoute === 'verify-email' || authRoute === 'update-password' ? 'sign-in' : 'welcome')} type="button">‹</button>
                : <span aria-hidden="true" className="native-auth-header-spacer" />}
              {authRoute === 'welcome' ? (
                <div className="native-auth-brand">
                  <DotsProgress className="native-auth-brand-dots" />
                  <span>common room</span>
                </div>
              ) : <span aria-hidden="true" className="native-auth-header-spacer" />}
              <button aria-label="Close" className="native-auth-close" onClick={() => setAuthModalOpen(false)} type="button">×</button>
            </CRHeader>
            {authRoute === 'welcome' ? (
              <div className="native-auth-welcome">
                <div aria-hidden="true" className="native-auth-hero-art">
                  <span className="native-auth-hero-circle" />
                  <span className="native-auth-hero-square" />
                  <span className="native-auth-hero-outline" />
                  <span className="native-auth-hero-mark"><i /><i /></span>
                </div>
                <div className="native-auth-welcome-copy">
                  <h1 className="native-auth-title">Your campus, in one room.</h1>
                  <p className="native-auth-subtitle">Post to your campus, say things anonymously, and buy and sell with students near you.</p>
                </div>
                {!configured ? (
                  <Banner className="native-auth-setup" variant="info">
                    Connect Supabase to enable real accounts and saved community data.
                  </Banner>
                ) : null}
                <section className="native-auth-panel">
                  <div className="native-auth-actions">
                    <CRButton className="native-auth-primary" disabled={!configured} fullWidth onClick={() => goToAuthRoute('sign-up')}>
                      Create account
                    </CRButton>
                    <CRButton className="native-auth-secondary" disabled={!configured} fullWidth onClick={() => goToAuthRoute('sign-in')}>
                      Sign in
                    </CRButton>
                  </div>
                  <p className="native-auth-terms">By continuing you agree to the <u>Terms</u> and <u>Community Guidelines</u>.</p>
                </section>
              </div>
            ) : (
              <>
                <DotsProgress className="native-auth-page-dots" current={authRoute === 'forgot-password' || authRoute === 'verify-email' ? 2 : 1} />
                <h1 className="native-auth-title">
                  {authRoute === 'sign-in'
                    ? 'Welcome back'
                    : authRoute === 'sign-up'
                      ? 'Create your account'
                      : authRoute === 'verify-email'
                        ? 'Check your email'
                        : authRoute === 'update-password'
                          ? 'New password'
                          : 'Reset your password'}
                </h1>
                <p className="native-auth-subtitle">
                  {authRoute === 'sign-in'
                    ? 'Sign in to pick up where you left off.'
                    : authRoute === 'sign-up'
                      ? 'Use your school email if you have one.'
                      : authRoute === 'verify-email'
                        ? `We sent a confirmation link to ${email}. Open it to verify your account.`
                        : authRoute === 'update-password'
                          ? 'Choose a new password for your account.'
                          : 'Enter your email and we will send a reset link.'}
                </p>
                {!configured ? (
                  <Banner className="native-auth-setup" variant="info">
                    Connect Supabase to enable real accounts and saved community data.
                  </Banner>
                ) : null}
                <section className="native-auth-panel">
                  {authRoute === 'sign-up' ? (
                    <form className="native-auth-form" onSubmit={submitAuth}>
                      <CRInput inputProps={{ autoComplete: 'name', required: true }} label="Full name" onChange={(event) => setSignupName(event.target.value)} placeholder="Full name" value={signupName} />
                      <CRInput inputProps={{ autoComplete: 'email', required: true }} label="Email address" onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" type="email" value={email} />
                      <CRInput
                        inputProps={{ autoComplete: 'new-password', minLength: 8, required: true }}
                        label="Create password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        rightIcon={showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                        rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
                        onRightIconClick={() => setShowPassword((visible) => !visible)}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      {error ? <Banner>{error}</Banner> : null}
                      {notice ? <Banner className="native-auth-success" variant="info">{notice}</Banner> : null}
                      <CRButton className="native-auth-primary" disabled={!configured} fullWidth type="submit">Create account</CRButton>
                      <button className="native-auth-text-button" onClick={() => goToAuthRoute('sign-in')} type="button">Already have an account? Sign in</button>
                    </form>
                  ) : null}
                  {authRoute === 'sign-in' ? (
                    <div className="native-auth-form">
                      <form className="native-auth-form" onSubmit={submitAuth}>
                        <CRInput inputProps={{ autoComplete: 'email', required: true }} label="Email address" onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" type="email" value={email} />
                        <CRInput
                          inputProps={{ autoComplete: 'current-password', required: true }}
                          label="Password"
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Your password"
                          rightIcon={showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                          rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
                          onRightIconClick={() => setShowPassword((visible) => !visible)}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                        />
                        {error ? <Banner>{error}</Banner> : null}
                        {notice ? <Banner className="native-auth-success" variant="info">{notice}</Banner> : null}
                        <div className="native-auth-inline-link">
                          <button className="native-auth-text-button" onClick={() => goToAuthRoute('forgot-password')} type="button">Forgot password?</button>
                        </div>
                        <CRButton className="native-auth-primary" disabled={!configured} fullWidth type="submit">Sign in</CRButton>
                      </form>
                      <div className="native-auth-social-actions">
                        <CRButton className="native-auth-social" disabled={!configured} onClick={signInWithApple} variant="ghost">
                          Continue with Apple
                        </CRButton>
                        <CRButton className="native-auth-social" disabled={!configured} onClick={signInWithGoogle} variant="ghost">
                          Continue with Google
                        </CRButton>
                      </div>
                      <button className="native-auth-text-button" onClick={() => goToAuthRoute('sign-up')} type="button">New to Common Room? Create account</button>
                    </div>
                  ) : null}
                  {authRoute === 'forgot-password' ? (
                    <form className="native-auth-form" onSubmit={requestPasswordReset}>
                      <CRInput inputProps={{ autoComplete: 'email', required: true }} label="Email" onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" type="email" value={email} />
                      {error ? <Banner>{error}</Banner> : null}
                      {notice ? <Banner className="native-auth-success" variant="info">{notice}</Banner> : null}
                      <CRButton className="native-auth-primary" disabled={!configured} fullWidth type="submit">Send reset link</CRButton>
                    </form>
                  ) : null}
                  {authRoute === 'verify-email' ? (
                    <div className="native-auth-form">
                      {error ? <Banner>{error}</Banner> : null}
                      {notice ? <Banner className="native-auth-success" variant="info">{notice}</Banner> : null}
                      <CRButton className="native-auth-primary" disabled={!configured} fullWidth onClick={() => void resendSignupConfirmation()}>
                        Resend confirmation email
                      </CRButton>
                      <button className="native-auth-text-button" onClick={() => goToAuthRoute('sign-in')} type="button">
                        Already verified? Sign in
                      </button>
                    </div>
                  ) : null}
                  {authRoute === 'update-password' ? (
                    <form className="native-auth-form" onSubmit={updatePassword}>
                      <CRInput
                        inputProps={{ autoComplete: 'new-password', minLength: 8, required: true }}
                        label="New password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        rightIcon={showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                        rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
                        onRightIconClick={() => setShowPassword((visible) => !visible)}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      <CRInput
                        inputProps={{ autoComplete: 'new-password', minLength: 8, required: true }}
                        label="Confirm password"
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Enter your new password again"
                        type="password"
                        value={confirmPassword}
                      />
                      {error ? <Banner>{error}</Banner> : null}
                      <CRButton className="native-auth-primary" disabled={!configured} fullWidth type="submit">Update password</CRButton>
                    </form>
                  ) : null}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    );
  };

  return (
    <main className="app-shell" data-theme={darkMode ? 'dark' : 'light'}>
      <section className="workspace">
        <div className="content-scroll">
          {error ? <div className="feedback error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div> : null}
          {notice ? <div className="feedback success-banner" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div> : null}
          {tab !== 'home' ? <CommunityAnnouncement /> : null}

          {tab === 'home' || tab === 'room' ? (
            <RoomExperience
              key={tab}
              initialFeedSection={tab === 'room' ? 'Videos' : 'For You'}
              accessToken={session?.access_token ?? ''}
              focusPostId={focusPostId}
              hasUnreadNotifications={false}
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
              onOpenAccountMenu={() => {
                setMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              onOpenNotifications={() => {
                setNotificationsOpen((prev) => !prev);
                setMenuOpen(false);
              }}
              onOpenProfile={() => setTab('profile')}
              onOpenSearch={() => setSearchModalOpen(true)}
              onRequireAccount={() => {
                setAuthRoute('sign-in');
                setAuthModalOpen(true);
              }}
              profile={currentProfile}
              refreshToken={roomRefresh}
              theme="light"
            />
          ) : null}

          {tab === 'create' ? (
            <section className="standalone-column cr-ui" style={{ maxWidth: 540, margin: '0 auto', padding: '16px', background: '#fff', borderRadius: 20 }}>
              {/* Header matching Mockup Screen 12 & 13 */}
              <div className="hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 36, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setTab(createDestination === 'anonymous' ? 'anonymous' : 'room')}
                  aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0b0b0b' }}
                >
                  <X size={20} />
                </button>
                <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 999, padding: 3 }}>
                  <button
                    type="button"
                    onClick={() => { setCreateDestination('room'); setCreateFiles([]); setSelectedSoundName(null); }}
                    style={{ border: 'none', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 500, background: createDestination === 'room' ? '#0b0b0b' : 'transparent', color: createDestination === 'room' ? '#fff' : '#6b6b6b', cursor: 'pointer' }}
                  >
                    Room
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreateDestination('anonymous'); setCreateType('text'); setCreateFiles([]); setSelectedSoundName(null); }}
                    style={{ border: 'none', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 500, background: createDestination === 'anonymous' ? '#0b0b0b' : 'transparent', color: createDestination === 'anonymous' ? '#fff' : '#6b6b6b', cursor: 'pointer' }}
                  >
                    Anonymous
                  </button>
                </div>
                <button
                  disabled={isPublishing || (!createCaption.trim() && createFiles.length === 0) || (createDestination === 'anonymous' && (!anonymousIdentity || anonymousIdentityLoading))}
                  onClick={() => createFormRef.current?.requestSubmit()}
                  type="button"
                  style={{
                    background: (!isPublishing && (createCaption.trim().length > 0 || createFiles.length > 0)) ? '#0b0b0b' : '#d9d9d9',
                    color: (!isPublishing && (createCaption.trim().length > 0 || createFiles.length > 0)) ? '#fff' : '#8a8a8a',
                    borderRadius: 12,
                    height: 32,
                    padding: '0 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12.5,
                    fontWeight: 500,
                    border: 'none',
                    cursor: (!isPublishing && (createCaption.trim().length > 0 || createFiles.length > 0)) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isPublishing ? (compressionProgress !== null ? `${compressionProgress}%` : 'Posting…') : 'Post'}
                </button>
              </div>

              {createDestination === 'anonymous' ? (
                <p style={{ fontSize: 11.5, color: '#6b6b6b', margin: '0 0 12px' }}>Never linked to your profile.</p>
              ) : null}

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
                <form className={`form-panel${createDestination === 'anonymous' ? ' anonymous-create-form' : ''}`} onSubmit={(event) => void publishPost(event)} ref={createFormRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Author Row with avatar and textarea matching Mockup 12 & 13 */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: createDestination === 'anonymous' ? '#efefef' : '#0b0b0b', color: createDestination === 'anonymous' ? '#0b0b0b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
                      {createDestination === 'anonymous' ? '?' : currentProfile.displayName ? currentProfile.displayName.slice(0, 1).toUpperCase() : 'Y'}
                    </div>
                    <textarea
                      value={createCaption}
                      onChange={(event) => setCreateCaption(event.target.value)}
                      maxLength={createDestination === 'anonymous' ? 300 : 500}
                      rows={3}
                      placeholder={createDestination === 'anonymous' ? 'Say it anonymously...' : "What's happening on campus?"}
                      style={{ flex: 1, minHeight: 70, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontSize: 14, lineHeight: 1.45, color: '#0b0b0b' }}
                    />
                  </div>

                  {/* Mode / Type selectors */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(createDestination === 'anonymous' ? ['text', 'photo', 'video'] as const : ['photo', 'video', 'poll', 'text'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setCreateType(type); setCreateFiles([]); setUploadError(''); setSelectedSoundName(null); setReelEditorOpen(false); setPhotoReelEditorOpen(false); }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 999,
                          border: '1px solid #e0e0e0',
                          background: createType === type ? '#0b0b0b' : '#fff',
                          color: createType === type ? '#fff' : '#0b0b0b',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {type === 'video' ? <Video size={13} /> : type === 'photo' ? <ImagePlus size={13} /> : null}
                        {formatPostType(type)}
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
                {createType === 'poll' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      Poll Options (2 to 6 choices)
                    </label>
                    {createPollOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          maxLength={100}
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...createPollOptions];
                            updated[idx] = e.target.value;
                            setCreatePollOptions(updated);
                          }}
                          style={{
                            background: '#1e293b',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            color: '#ffffff',
                            fontSize: 14,
                            flex: 1,
                          }}
                        />
                        {createPollOptions.length > 2 ? (
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: '8px 12px' }}
                            onClick={() => setCreatePollOptions(createPollOptions.filter((_, i) => i !== idx))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {createPollOptions.length < 6 ? (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ width: 'fit-content', marginTop: 4 }}
                        onClick={() => setCreatePollOptions([...createPollOptions, ''])}
                      >
                        + Add Option
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {createType === 'photo' || createType === 'video' ? (
                  <>
                    <MediaUploadQueue
                      accept={createType === 'photo' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime,video/webm'}
                      disabled={isPublishing}
                      error={uploadError}
                      files={createFiles}
                      maxFiles={createDestination === 'room' && createType === 'photo' ? 10 : undefined}
                      multiple={createType === 'photo' || createDestination === 'anonymous'}
                      uploading={isPublishing && compressionProgress === null && createFiles.length > 0}
                      onClear={() => {
                        setCreateFiles([]);
                        setPreviewFile(null);
                        setSelectedSoundName(null);
                        setReelEditorOpen(false);
                        setPhotoReelEditorOpen(false);
                        setUploadError('');
                      }}
                      onFilesSelected={(files, append) => selectCreateFiles(files, append)}
                      onPreview={(index) => {
                        const file = createFiles[index];
                        const url = createPreviewUrls[index];
                        if (file && url) setPreviewFile({ url, file, isVideo: file.type.startsWith('video/') });
                      }}
                      onRemove={(index) => {
                        const file = createFiles[index];
                        setCreateFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                        if (previewFile?.file === file) setPreviewFile(null);
                        setSelectedSoundName(null);
                        setUploadError('');
                      }}
                      onRetry={() => createFormRef.current?.requestSubmit()}
                      previews={createPreviewUrls}
                      progress={compressionProgress}
                    />
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
                  </>
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
                <div className="sp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11.5, color: '#6b6b6b' }}>
                  <span>{createDestination === 'anonymous' ? 'Follows Community Guidelines' : 'Add #tags to help people find this'}</span>
                  <span>{createCaption.length} / {createDestination === 'anonymous' ? 300 : 500}</span>
                </div>
                {createDestination === 'anonymous' ? (
                  <p style={{ fontSize: 11.5, color: '#8a8a8a', margin: '4px 0 0' }}>You can delete a post later, but not edit it.</p>
                ) : null}
                {compressionProgress !== null ? <p className="media-compression-status" role="status">Uploading {compressionProgress}%. You can post when it finishes.</p> : null}
                <button className="primary-button anonymous-post-submit" disabled={isPublishing || (createDestination === 'anonymous' && (!anonymousIdentity || anonymousIdentityLoading))} type="submit" style={{ display: 'none' }}>{isPublishing ? (compressionProgress !== null ? `Uploading ${compressionProgress}%…` : 'Uploading…') : createDestination === 'anonymous' ? 'Post anonymously' : 'Post'}</button>
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

          {tab === 'profile' ? (
            <ProfileExperience
              session={session}
              profile={profile}
              isGuest={isGuest}
              onSignOut={() => void signOut()}
              onRequireAccount={() => { setAuthRoute('sign-up'); setAuthModalOpen(true); }}
              onClose={() => setTab('home')}
              onSaveProfile={async (updated) => {
                if (!session) return false;
                try {
                  let avatarUrl = updated.avatarRemoved ? null : profile?.avatarUrl ?? null;
                  if (updated.avatarFile) {
                    const ext = mediaFileExtension(updated.avatarFile);
                    const path = `${session.user.id}/profile-${crypto.randomUUID()}.${ext}`;
                    const { error: uploadError } = await getBrowserSupabase().storage.from('post-media').upload(path, updated.avatarFile, {
                      contentType: updated.avatarFile.type,
                      upsert: false,
                    });
                    if (uploadError) throw new Error(uploadError.message);
                    const { data: pubData } = getBrowserSupabase().storage.from('post-media').getPublicUrl(path);
                    avatarUrl = pubData.publicUrl;
                  }
                  const response = await fetch('/api/v1/profile', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      displayName: updated.displayName,
                      school: updated.school,
                      course: updated.course,
                      year: updated.year,
                      interests: updated.interests,
                      showSchoolOnProfile: updated.showSchoolOnProfile,
                      educationStatus: profile?.educationStatus || 'currently_in_school',
                      ageEligibilityConfirmed: true,
                      avatarUrl,
                    }),
                  });
                  if (!response.ok) return false;
                  await loadProfile(session);
                  return true;
                } catch {
                  return false;
                }
              }}
            />
          ) : null}
        </div>

        {menuOpen ? (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="account-menu">
              <div className="account-menu-header">
                <span className="profile-avatar">
                  {currentProfile.avatarUrl
                    ? <img alt="" src={currentProfile.avatarUrl} />
                    : currentProfile.displayName.slice(0, 1).toUpperCase()}
                </span>
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
                <button onClick={() => { setTab('create'); setMenuOpen(false); }} type="button">
                  <Plus size={16} /> Create post
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
                </div>
              </div>
              <div className="notifications-list">
                <div className="notification-unavailable" role="status">
                  <Bell aria-hidden="true" size={18} />
                  <p>Notifications aren’t connected yet.</p>
                  <small>Your activity will appear here when notifications are available.</small>
                </div>
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
                  placeholder="Search students or schools"
                  value={searchQuery}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') rememberSearch(searchQuery);
                  }}
                />
                {searchQuery ? (
                  <button className="search-modal-clear" onClick={() => updateSearchQuery('')} aria-label="Clear search" type="button">
                    <X size={15} />
                  </button>
                ) : null}
                <button className="search-modal-close" onClick={() => setSearchModalOpen(false)} type="button">
                  Close
                </button>
              </div>

              <div className="search-modal-tags">
                <span className="search-tags-label">Recent searches:</span>
                {recentSearches.length ? recentSearches.map((recent) => (
                  <button
                    key={recent}
                    className="search-tag-chip"
                    onClick={() => updateSearchQuery(recent)}
                    type="button"
                  >
                    {recent}
                  </button>
                )) : <span className="search-tags-label">No recent searches</span>}
              </div>

              <div className="search-modal-results">
                {searchQuery.trim() ? (
                  <>
                    <div className="search-section-title">Schools</div>
                    {institutions
                      .filter((inst) => `${inst.name} ${inst.location}`.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 4)
                      .map((inst) => (
                        <div key={inst.name} className="search-result-item">
                          <div className="search-result-avatar">{inst.name.slice(0, 1)}</div>
                          <div className="search-result-text">
                            <strong>{inst.name}</strong>
                            <span>{inst.location}</span>
                          </div>
                        </div>
                      ))}
                    <div className="search-section-title">Students</div>
                    {searchQuery.trim().length < 2 ? <p className="search-empty-prompt">Enter at least 2 characters.</p> : null}
                    {searchState === 'loading' ? <p className="search-empty-prompt" role="status">Searching students…</p> : null}
                    {searchState === 'error' ? (
                      <div className="search-empty-prompt" role="alert">
                        <p>Student search couldn’t load. Try again.</p>
                        <button className="search-tag-chip" onClick={() => setSearchRetry((value) => value + 1)} type="button">Retry search</button>
                      </div>
                    ) : null}
                    {!session || session.user.is_anonymous ? (
                      <p className="search-empty-prompt">Sign in to search students.</p>
                    ) : null}
                    {peopleResults.map((person) => (
                        <button
                          key={person.id}
                          className="search-result-item search-result-person"
                          onClick={() => { rememberSearch(searchQuery); void openPersonProfile(person.id); }}
                          type="button"
                        >
                          <div className="search-result-avatar person">
                            {person.avatar_url ? <img alt="" src={person.avatar_url} /> : person.display_name.slice(0, 1)}
                          </div>
                          <div className="search-result-text">
                            <strong>{person.display_name}{person.username ? ` · @${person.username}` : ''}</strong>
                            <span>{person.school ?? 'Commonroom member'}</span>
                          </div>
                        </button>
                    ))}
                    {searchState === 'ready' && !peopleResults.length && session && !session.user.is_anonymous ? (
                      <p className="search-empty-prompt">No students found for “{searchQuery.trim()}”.</p>
                    ) : null}
                  </>
                ) : (
                  <div className="search-empty-prompt">
                    <p>Type a student’s name or a school to search.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {personProfileLoading || personProfileError || selectedPerson ? (
          <div
            className="person-profile-overlay"
            onClick={closePersonProfile}
          >
            <section
              aria-label={selectedPerson ? `${selectedPerson.display_name} profile` : 'Student profile'}
              aria-modal="true"
              className="person-profile-sheet"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <button
                aria-label="Close profile"
                className="search-modal-close"
                onClick={closePersonProfile}
                type="button"
              >
                Close
              </button>
              {personProfileLoading ? <p role="status">Loading profile…</p> : null}
              {personProfileError ? <p className="form-error" role="alert">{personProfileError}</p> : null}
              {selectedPerson ? (
                <>
                  <div className="person-profile-heading">
                    <span className="person-profile-avatar">
                      {selectedPerson.avatar_url
                        ? <img alt="" src={selectedPerson.avatar_url} />
                        : selectedPerson.display_name.slice(0, 1)}
                    </span>
                    <div>
                      <h2>{selectedPerson.display_name}</h2>
                      {selectedPerson.username ? <p>@{selectedPerson.username}</p> : null}
                    </div>
                  </div>
                  {selectedPerson.school ? <p className="person-profile-school">{selectedPerson.school}</p> : null}
                  {selectedPerson.bio ? <p className="person-profile-bio">{selectedPerson.bio}</p> : null}
                  <p className="person-profile-stats">{selectedPerson.follower_count} followers · {selectedPerson.posts.length} posts</p>
                  {selectedPerson.interests.length ? (
                    <div className="person-profile-interests">
                      {selectedPerson.interests.map((interest) => <span key={interest}>{interest}</span>)}
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>

      <BottomNav
        active={tab === 'room' ? 'Room' : tab === 'anonymous' ? 'Anonymous' : tab === 'marketplace' ? 'Market' : tab === 'profile' ? 'Me' : 'Home'}
        onNavigate={(destination: BottomNavItemLabel) => {
          const nextTab: AppTab = destination === 'Room'
            ? 'room'
            : destination === 'Anonymous'
              ? 'anonymous'
              : destination === 'Market'
                ? 'marketplace'
                : destination === 'Me'
                  ? 'profile'
                  : 'home';
          if (nextTab === 'profile' && isGuest) {
            setAuthRoute('sign-in');
            setAuthModalOpen(true);
            return;
          }
          setError('');
          setTab(nextTab);
        }}
      />
      {renderAuthModal()}
    </main>
  );
}

function ProfileForm({
  ageConfirmed,
  avatarFile,
  avatarPreview,
  avatarUrl,
  avatarRemoved,
  avatarError,
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
  onAvatarFiles,
  onAvatarClear,
  onAvatarRemove,
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
  avatarFile: File | null;
  avatarPreview: string | null;
  avatarUrl: string | null;
  avatarRemoved: boolean;
  avatarError: string;
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
  onAvatarFiles: (files: File[]) => void;
  onAvatarClear: () => void;
  onAvatarRemove: () => void;
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
      <div className="profile-photo-field">
        <span className="field-label">Profile photo</span>
        {avatarUrl && !avatarFile && !avatarRemoved ? (
          <>
            <img alt={`${displayName || 'Your'} profile`} className="profile-photo-current" src={avatarUrl} />
            <button className="profile-photo-remove" onClick={onAvatarRemove} type="button">Remove current photo</button>
          </>
        ) : null}
        <MediaUploadQueue
          accept="image/jpeg,image/png,image/webp"
          files={avatarFile ? [avatarFile] : []}
          onClear={onAvatarClear}
          onFilesSelected={onAvatarFiles}
          onRemove={onAvatarClear}
          previews={avatarPreview ? [avatarPreview] : []}
        />
        {avatarError ? <p className="form-error" role="alert">{avatarError}</p> : null}
        <small>JPG, PNG, or WebP · up to 10 MB</small>
      </div>
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
