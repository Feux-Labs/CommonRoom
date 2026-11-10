'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ToastProvider, useToast } from '@/components/cr/Toast';
import { AuthFlow, type AuthRoute } from '@/features/auth/AuthFlow';
import { Onboarding } from '@/features/auth/Onboarding';
import type { EducationStatus, OnboardingProfile } from '@/lib/contracts';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';
import { guestSignInOptions } from '@/lib/turnstile';
import { apiRequest, errorMessage } from './api';
import { removeUserMedia, uploadUserMedia } from './media';

export type Profile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  educationStatus: EducationStatus;
  school: string | null;
  showSchoolOnProfile: boolean;
  course: string;
  year: string;
  ageEligibilityConfirmed: boolean;
  interests: string[];
};

export type ProfileApiRecord = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url?: string | null;
  education_status: EducationStatus;
  school: string | null;
  show_school_on_profile: boolean;
  course: string;
  year: string;
  age_eligibility_confirmed: boolean;
  interests: string[];
};

export function toProfile(record: ProfileApiRecord, fallbackAvatarUrl: string | null = null): Profile {
  return {
    id: record.id,
    displayName: record.display_name,
    username: record.username,
    avatarUrl: record.avatar_url ?? fallbackAvatarUrl,
    educationStatus: record.education_status,
    school: record.school,
    showSchoolOnProfile: record.show_school_on_profile,
    course: record.course ?? '',
    year: record.year ?? '',
    ageEligibilityConfirmed: record.age_eligibility_confirmed,
    interests: record.interests ?? [],
  };
}

type AppSessionValue = {
  /** False until the first session check finished. */
  ready: boolean;
  configured: boolean;
  session: Session | null;
  /** Registered (non-anonymous) session, or null for guests. */
  account: Session | null;
  profile: Profile | null;
  isGuest: boolean;
  /** Opens the account flow; returns false so callers can `if (!requireAccount()) return`. */
  requireAccount: (route?: AuthRoute) => boolean;
  openAuth: (route: AuthRoute) => void;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
};

const AppSessionContext = createContext<AppSessionValue | null>(null);

/** Routes that must work for logged-out visitors without the onboarding gate. */
const PUBLIC_PATHS = [/^\/anonymous\/inbox\/[^/]+/, /^\/(terms|privacy|guidelines)\/?$/];

function metadataName(session: Session | null) {
  const metadata = session?.user.user_metadata ?? {};
  const candidates = [metadata.display_name, metadata.full_name, metadata.name];
  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? '';
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppSessionProvider>{children}</AppSessionProvider>
    </ToastProvider>
  );
}

function AppSessionProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [configured] = useState(() => isSupabaseConfigured());
  const [ready, setReady] = useState(() => !isSupabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [profileCheckedFor, setProfileCheckedFor] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authRoute, setAuthRoute] = useState<AuthRoute>('welcome');
  const [recoverySession, setRecoverySession] = useState(false);
  const userSignOut = useRef(false);
  const lastRegisteredUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (active: Session) => {
    const record = await apiRequest<ProfileApiRecord | null>('/api/v1/profile', { session: active });
    setProfileState(record ? toProfile(record) : null);
    setProfileCheckedFor(active.user.id);
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const supabase = getBrowserSupabase();

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) console.error('Session could not be restored.', error);
      let current = data.session;
      if (!current) {
        try {
          const guest = await supabase.auth.signInAnonymously(await guestSignInOptions());
          if (!guest.error && guest.data.session) current = guest.data.session;
        } catch {
          // Anonymous sign-in disabled or offline: continue as a signed-out visitor.
        }
      }
      if (!active) return;
      setSession(current);
      if (current && !current.user.is_anonymous) {
        lastRegisteredUserId.current = current.user.id;
        try {
          await loadProfile(current);
        } catch (loadError) {
          toast.show(errorMessage(loadError, 'Your profile could not be loaded.'), 'error');
        }
      }
      if (active) setReady(true);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      // The initial session is restored by getSession() above.
      if (!active || event === 'INITIAL_SESSION') return;
      const previous = lastRegisteredUserId.current;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySession(true);
        setAuthRoute('reset-password');
        setAuthOpen(true);
        return;
      }
      if (event === 'SIGNED_OUT') {
        lastRegisteredUserId.current = null;
        setProfileState(null);
        setProfileCheckedFor(null);
        if (previous && !userSignOut.current) {
          setRecoverySession(false);
          setAuthRoute('session-expired');
          setAuthOpen(true);
        }
        userSignOut.current = false;
        return;
      }
      if (next && !next.user.is_anonymous) {
        const switchedUser = lastRegisteredUserId.current !== next.user.id;
        lastRegisteredUserId.current = next.user.id;
        if (switchedUser || event === 'USER_UPDATED') {
          queueMicrotask(() => {
            void loadProfile(next).catch((loadError: unknown) => {
              if (active) toast.show(errorMessage(loadError, 'Your profile could not be loaded.'), 'error');
            });
          });
        }
      } else {
        lastRegisteredUserId.current = null;
        setProfileState(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, loadProfile, toast]);

  const openAuth = useCallback((route: AuthRoute) => {
    setRecoverySession(false);
    setAuthRoute(route);
    setAuthOpen(true);
  }, []);

  const account = session && !session.user.is_anonymous ? session : null;
  const isGuest = !account || !profile;

  const requireAccount = useCallback((route: AuthRoute = 'sign-in') => {
    if (account && profile) return true;
    openAuth(route);
    return false;
  }, [account, openAuth, profile]);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    userSignOut.current = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
      userSignOut.current = false;
      toast.show(error.message, 'error');
      return;
    }
    try {
      const guest = await supabase.auth.signInAnonymously(await guestSignInOptions());
      setSession(guest.data.session ?? null);
    } catch {
      setSession(null);
    }
    setProfileState(null);
    toast.show('Signed out');
  }, [toast]);

  const reloadProfile = useCallback(async () => {
    if (account) await loadProfile(account);
  }, [account, loadProfile]);

  const completeOnboarding = useCallback(async (draft: OnboardingProfile, avatarFile: File | null) => {
    if (!account) throw new Error('Your session expired. Sign in again to finish setting up your profile.');
    let uploaded: { path: string; url: string } | null = null;
    try {
      if (avatarFile) uploaded = await uploadUserMedia(account, avatarFile, 'profile-');
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', {
        session: account,
        method: 'PUT',
        body: { ...draft, avatarUrl: uploaded?.url ?? null },
      });
      setProfileState(toProfile(saved, uploaded?.url ?? null));
      setProfileCheckedFor(account.user.id);
      toast.show('Welcome to Common Room');
    } catch (error) {
      if (uploaded) await removeUserMedia([uploaded.path]);
      throw error;
    }
  }, [account, toast]);

  const value = useMemo<AppSessionValue>(() => ({
    ready,
    configured,
    session,
    account,
    profile,
    isGuest,
    requireAccount,
    openAuth,
    signOut,
    reloadProfile,
    setProfile: setProfileState,
  }), [account, configured, isGuest, openAuth, profile, ready, reloadProfile, requireAccount, session, signOut]);

  // Read from the address bar when needed (not usePathname, which would block prerendering of every page).
  // Only used after the session has loaded, so server and first client render always agree.
  const isPublicPath = typeof window !== 'undefined' && PUBLIC_PATHS.some((pattern) => pattern.test(window.location.pathname));
  const needsOnboarding = Boolean(
    configured && account && profileCheckedFor === account.user.id && !profile && !authOpen && !isPublicPath,
  );

  return (
    <AppSessionContext.Provider value={value}>
      {needsOnboarding && account ? (
        <Onboarding
          ageConfirmed={account.user.user_metadata?.age_eligibility_confirmed === true}
          initialName={metadataName(account)}
          onComplete={completeOnboarding}
          onSignOut={() => void signOut()}
        />
      ) : children}
      {authOpen ? (
        <AuthFlow
          configured={configured}
          onClose={() => setAuthOpen(false)}
          onRouteChange={setAuthRoute}
          onSignedIn={(message) => {
            setAuthOpen(false);
            setRecoverySession(false);
            if (message) toast.show(message);
          }}
          recoverySession={recoverySession}
          route={authRoute}
        />
      ) : null}
    </AppSessionContext.Provider>
  );
}

export function useAppSession(): AppSessionValue {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error('useAppSession must be used inside <AppProviders>.');
  return context;
}
