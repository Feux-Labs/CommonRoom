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
  Sparkles,
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
import { GamesExperience } from '@/components/GamesExperience';
import { MarketplaceExperience } from '@/components/MarketplaceExperience';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { RoomExperience } from '@/components/RoomExperience';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Audience, FeedPost, MediaItem, MediaType, OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

type AppTab = 'home' | 'create' | 'anonymous' | 'marketplace' | 'games' | 'dating' | 'profile';
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
type DatingProfile = {
  user_id: string;
  display_name: string;
  school: string | null;
  bio: string;
  interests: string[];
};

type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };

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

function formatPostType(type: MediaType) {
  return type === 'question' ? 'Question' : type === 'poll' ? 'Poll' : type === 'video' ? 'Video' : type === 'photo' ? 'Photo' : 'Text';
}

export default function Home() {
  const pathname = usePathname();
  const focusPostId = pathname?.startsWith('/posts/') ? pathname.split('/')[2] ?? null : null;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [tab, setTabState] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('commonroom_active_tab') as AppTab;
      if (saved && ['home', 'create', 'dating', 'marketplace', 'games', 'anonymous', 'profile'].includes(saved)) {
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
  const [datingProfiles, setDatingProfiles] = useState<DatingProfile[]>([]);
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
  const [createCaption, setCreateCaption] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createAudience, setCreateAudience] = useState<Audience>('Public');
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; file: File; isVideo: boolean } | null>(null);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [datingOptIn, setDatingOptIn] = useState(false);
  const [datingBio, setDatingBio] = useState('');
  const [datingInterests, setDatingInterests] = useState('');
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
        setDatingProfiles([]);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configuredNow, loadProfile]);

  const loadDating = useCallback(async () => {
    if (!session) return;
    const result = await apiRequest<DatingProfile[]>('/api/v1/dating', session.access_token);
    setDatingProfiles(result);
  }, [session]);

  useEffect(() => {
    if (profile && tab === 'dating') {
      void loadDating().catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Dating profiles could not be loaded.');
      });
    }
  }, [loadDating, profile, tab]);

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

  const publishPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setError('');
    setNotice('');
    try {
      const mediaItems: MediaItem[] = [];
      if (createFiles.length > 10) throw new Error('A post can contain up to 10 photos.');
      for (const file of createFiles) {
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
      const options = pollOptions.map((option) => option.trim()).filter(Boolean);
      if (createType === 'poll' && (options.length < 2 || options.length > 6)) {
        throw new Error('A poll needs between two and six answer options.');
      }
      const created = await apiRequest<FeedPost>('/api/v1/posts', session.access_token, 'POST', {
        caption: createCaption,
        mediaItems,
        mediaType: createType,
        pollOptions: options,
        audience: createAudience,
        location: createLocation,
      });
      setCreateCaption('');
      setCreateLocation('');
      setCreateFiles([]);
      setPollOptions(['', '']);
      setTab('home');
      setRoomRefresh((value) => value + 1);
      setNotice('Your post is published.');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Your post could not be published.');
    }
  };

  const saveDatingProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !profile) return;
    try {
      await apiRequest('/api/v1/dating', session.access_token, 'PUT', {
        displayName: profile.displayName,
        bio: datingBio,
        interests: datingInterests.split(',').map((interest) => interest.trim()).filter(Boolean),
        discoverable: datingOptIn,
      });
      await loadDating();
      setNotice(datingOptIn ? 'Your dating profile is discoverable.' : 'Your dating profile is hidden.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your dating settings could not be saved.');
    }
  };

  const likeDatingProfile = async (userId: string) => {
    if (!session) return;
    try {
      const result = await apiRequest<{ matched: boolean }>(
        '/api/v1/dating',
        session.access_token,
        'POST',
        { userId },
      );
      setNotice(result.matched ? 'It is a mutual match!' : 'Like sent. Your contact details stay private.');
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Your like could not be sent.');
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
    { id: 'dating', label: 'Meet', icon: Sparkles },
  ];
  const mobileTabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Room', icon: HomeIcon },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'anonymous', label: 'Anonymous', icon: MessageCircle },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'dating', label: 'Connect', icon: Users },
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
            <h2>{tabs.find((item) => item.id === tab)?.label ?? (tab === 'games' ? 'Games' : tab === 'profile' ? 'My profile' : 'Dating')}</h2>
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
              {isGuest ? (
                <div className="panel guest-prompt-panel">
                  <Sparkles size={36} className="guest-prompt-icon" />
                  <h2>Join your campus community</h2>
                  <p>Sign in or create an account to post photos, videos, questions, and polls to Commonroom.</p>
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
                <form className="panel form-panel" onSubmit={(event) => void publishPost(event)}>
                <div className="segmented-control">
                  {(['photo', 'video', 'text', 'question', 'poll'] as MediaType[]).map((type) => (
                    <button key={type} type="button" className={createType === type ? 'segment selected' : 'segment'} onClick={() => { setCreateType(type); setCreateFiles([]); }}>
                      {type === 'video' ? <Video size={15} /> : type === 'photo' ? <ImagePlus size={15} /> : null}{formatPostType(type)}
                    </button>
                  ))}
                </div>
                {createType === 'photo' || createType === 'video' ? (
                  createFiles.length === 0 ? (
                    <label className="upload-zone">
                      <ImagePlus size={24} />
                      <strong>Choose {createType === 'photo' ? 'photos' : 'a video'}</strong>
                      <span>Media uploads directly to your private community storage.</span>
                      <input
                        accept={createType === 'photo' ? 'image/*' : 'video/*'}
                        multiple={createType === 'photo'}
                        type="file"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          setCreateFiles(files);
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
                          }}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="upload-preview-grid">
                        {createFiles.map((file, index) => {
                          const isVideo = file.type.startsWith('video/');
                          const url = URL.createObjectURL(file);
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

                        {createType === 'photo' && createFiles.length < 10 ? (
                          <label className="upload-add-more" aria-label="Add more photos" title="Add more photos">
                            <Plus size={20} />
                            <span>Add more</span>
                            <input
                              accept="image/*"
                              multiple
                              type="file"
                              onChange={(event) => {
                                const additional = Array.from(event.target.files ?? []);
                                setCreateFiles((prev) => [...prev, ...additional].slice(0, 10));
                                event.target.value = '';
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
                  )
                ) : null}
                <label>Caption<textarea value={createCaption} onChange={(event) => setCreateCaption(event.target.value)} maxLength={3000} rows={4} placeholder={createType === 'question' ? 'Ask the community…' : 'What would you like to share?'} /></label>
                {createType === 'poll' ? (
                  <div className="poll-options">
                    <span className="field-label">Poll answers</span>
                    {pollOptions.map((option, index) => <input key={index} placeholder={`Option ${index + 1}`} value={option} maxLength={100} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />)}
                    {pollOptions.length < 6 ? <button className="subtle-link" type="button" onClick={() => setPollOptions((current) => [...current, ''])}>+ Add option</button> : null}
                  </div>
                ) : null}
                <div className="form-grid">
                  <label>Location (optional)<input value={createLocation} onChange={(event) => setCreateLocation(event.target.value)} maxLength={120} placeholder="Add a location" /></label>
                  <label>Audience<select value={createAudience} onChange={(event) => setCreateAudience(event.target.value as Audience)}><option>Public</option><option>Followers</option><option>Private</option></select></label>
                </div>
                <div className="form-footnote"><ShieldCheck size={16} /><span>Audience permissions are enforced by the API and database policies.</span></div>
                <button className="primary-button" type="submit">Publish to Commonroom</button>
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
                      setPreviewFile(null);
                    }}
                  >
                    Remove this photo
                  </button>
                </footer>
              </div>
            </div>
          ) : null}

          {tab === 'anonymous' ? (
            <AnonymousExperience initialSession={session} onBack={() => setTab('home')} />
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

          {tab === 'dating' ? (
            <section className="standalone-column">
              <div className="page-heading"><div><span className="eyebrow">CAMPUS CONNECTIONS · YOU’RE IN CONTROL</span><h1>Meet</h1><p>No exact location, contact details, or private phone numbers are shown.</p></div></div>
              <form className="panel dating-settings" onSubmit={(event) => void saveDatingProfile(event)}>
                <div><strong>Meet profile</strong><p>Choose whether your profile can appear to other age-eligible students.</p></div>
                <label className="switch-row"><span>Show my profile to students</span><input checked={datingOptIn} onChange={(event) => setDatingOptIn(event.target.checked)} type="checkbox" /></label>
                <label>Short bio<textarea value={datingBio} onChange={(event) => setDatingBio(event.target.value)} maxLength={500} rows={2} placeholder="A little about you" /></label>
                <label>Interests<input value={datingInterests} onChange={(event) => setDatingInterests(event.target.value)} placeholder="Music, books, vibes" /></label>
                <button className="secondary-button" type="submit">Save Meet preferences</button>
              </form>
              <div className="dating-grid">
                {datingProfiles.length ? datingProfiles.map((match) => (
                  <article className="panel dating-card" key={match.user_id}>
                    <div className="dating-avatar">{match.display_name.slice(0, 1).toUpperCase()}</div>
                    <strong>{match.display_name}</strong>
                    <span>{match.school ?? 'Student community'}</span>
                    <p>{match.bio}</p>
                    <div className="dating-tags">{match.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
                    <button className="primary-button" onClick={() => void likeDatingProfile(match.user_id)}><Heart size={15} /> Connect</button>
                  </article>
                )) : <EmptyState icon={<Sparkles size={24} />} title="No profiles to show right now" copy="Opt in above to discover other students who choose to be visible." />}
              </div>
            </section>
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
                  <Sparkles size={36} className="guest-prompt-icon" />
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
                <button onClick={() => { setTab('dating'); setMenuOpen(false); }} type="button">
                  <Heart size={16} /> Dating
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
                      {item.type === 'like' ? <Heart size={13} fill="currentColor" /> : item.type === 'comment' ? <MessageCircle size={13} fill="currentColor" /> : item.type === 'follow' ? <UserPlus size={13} /> : <Sparkles size={13} />}
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

function EmptyState({
  icon,
  title,
  copy,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      {action && onAction ? <button className="secondary-button" onClick={onAction}>{action}</button> : null}
    </div>
  );
}
