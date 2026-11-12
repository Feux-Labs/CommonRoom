'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { PushToggle } from '@/features/app/PushToggle';
import { Icon } from '@/components/cr/Icon';
import { Toggle } from '@/components/cr/primitives';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { toProfile, useAppSession, type ProfileApiRecord } from '@/features/app/AppSession';
import { PASSWORD_RULES, passwordMeetsRules } from '@/features/auth/auth-config';
import { describeAuthError } from '@/features/auth/auth-errors';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { applyTheme, readTheme, type ThemeChoice } from '@/lib/theme';

/**
 * Mockups 45–47 and 52, limited to settings the backend actually stores.
 * Notification, feed and app-preference settings have no API yet and are not shown.
 */
export function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { account, profile, setProfile, signOut } = useAppSession();
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!account || !profile) {
    return (
      <main className="cr-screen">
        <header className="cr-hd"><button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/anonymous')} type="button"><Icon name="back" /></button></header>
      </main>
    );
  }

  const setShowSchool = async (value: boolean) => {
    setSavingPrivacy(true);
    const previous = profile;
    setProfile({ ...profile, showSchoolOnProfile: value });
    try {
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', {
        session: account,
        method: 'PUT',
        body: {
          displayName: profile.displayName,
          course: profile.course,
          year: profile.year,
          school: profile.school,
          educationStatus: profile.educationStatus,
          showSchoolOnProfile: value,
          ageEligibilityConfirmed: true,
          interests: profile.interests,
          avatarUrl: profile.avatarUrl,
        },
      });
      setProfile(toProfile(saved, profile.avatarUrl));
      toast.show('Saved');
    } catch (error) {
      setProfile(previous);
      toast.show(errorMessage(error, 'Your setting could not be saved.'), 'error');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const hasPassword = account.user.app_metadata?.provider === 'email' || (account.user.identities ?? []).some((identity) => identity.provider === 'email');

  return (
    <main className="cr-screen cr-settings">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/me')} type="button"><Icon name="back" /></button>
        <h1 className="cr-hd__t">Settings</h1>
        <span className="cr-hd__spacer" />
      </header>

      <p className="cr-section-label">Account</p>
      <div className="cr-setrow"><div className="cr-setrow__main"><span>Email</span><small>{account.user.email || 'No email on this account'}</small></div></div>
      <div className="cr-setrow"><div className="cr-setrow__main"><span>Username</span><small>{profile.username ? `@${profile.username}` : 'Not set'}</small></div></div>
      {hasPassword ? (
        <button className="cr-row-btn" onClick={() => setPasswordOpen(true)} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Change password</span></span><Icon name="rt" /></button>
      ) : null}
      <Link className="cr-row-btn" href="/me/edit"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Edit profile</span></span><Icon name="rt" /></Link>

      <p className="cr-section-label">Appearance</p>
      <ThemeChooser />

      <PushToggle />
      <Link className="cr-row-btn" href="/help"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Help and report a problem</span><span className="cr-row-btn__sub">Tell us what went wrong. We reply here.</span></span><Icon name="rt" /></Link>

      <p className="cr-section-label">Privacy</p>
      <div className="cr-setrow">
        <div className="cr-setrow__main"><span>Show my school</span><small>On your profile and Room posts</small></div>
        <Toggle label="Show my school" on={profile.showSchoolOnProfile} onChange={savingPrivacy ? undefined : (value) => void setShowSchool(value)} />
      </div>
      <Link className="cr-row-btn" href="/anonymous/link"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Anonymous link</span><span className="cr-row-btn__sub">Pause or share your message link</span></span><Icon name="rt" /></Link>

      <p className="cr-section-label">Safety</p>
      <Link className="cr-row-btn" href="/settings/blocked"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Blocked accounts</span><span className="cr-row-btn__sub">People who can’t see you or message you</span></span><Icon name="rt" /></Link>
      <Link className="cr-row-btn" href="/settings/muted"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Muted accounts</span><span className="cr-row-btn__sub">People you don’t see in your feed</span></span><Icon name="rt" /></Link>

      <p className="cr-section-label">About</p>
      <Link className="cr-row-btn" href="/guidelines"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Community Guidelines</span></span><Icon name="rt" /></Link>
      <Link className="cr-row-btn" href="/terms"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Terms of Use</span></span><Icon name="rt" /></Link>
      <Link className="cr-row-btn" href="/privacy"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Privacy Policy</span></span><Icon name="rt" /></Link>

      <p className="cr-section-label">Session</p>
      <button className="cr-row-btn" onClick={() => setSignOutOpen(true)} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Sign out</span></span><Icon name="rt" /></button>
      <button className="cr-row-btn cr-row-btn--danger" onClick={() => setDeleteOpen(true)} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Delete account</span></span><Icon name="rt" /></button>

      <ChangePasswordSheet onClose={() => setPasswordOpen(false)} open={passwordOpen} />

      <BottomSheet onClose={() => setSignOutOpen(false)} open={signOutOpen} title="Sign out?">
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setSignOutOpen(false)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" onClick={() => { setSignOutOpen(false); void signOut().then(() => router.push('/anonymous')); }} type="button">Sign out</button>
        </div>
      </BottomSheet>

      <DeleteAccountSheet onClose={() => setDeleteOpen(false)} open={deleteOpen} />
    </main>
  );
}

function ThemeChooser() {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) setChoice(readTheme()); })();
    return () => { active = false; };
  }, []);
  const pick = (next: ThemeChoice) => { setChoice(next); applyTheme(next); };
  return (
    <div className="cr-setrow">
      <div className="cr-setrow__main"><span>Theme</span><small>Matches your phone unless you choose</small></div>
      <span aria-label="Theme" className="cr-themepick" role="group">
        {(['system', 'light', 'dark'] as const).map((value) => (
          <button aria-pressed={choice === value} key={value} onClick={() => pick(value)} type="button">{value === 'system' ? 'Auto' : value === 'light' ? 'Light' : 'Dark'}</button>
        ))}
      </span>
    </div>
  );
}

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordMeetsRules(password)) {
      setError('Use at least 8 characters with a number and a letter.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: updateError } = await getBrowserSupabase().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(describeAuthError(updateError).message);
      return;
    }
    setPassword('');
    setConfirm('');
    toast.show('Password updated');
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} open={open} title="Change password">
      <form noValidate onSubmit={(event) => void submit(event)}>
        <label className="cr-label" htmlFor="cr-new-password">New password</label>
        <div className="cr-input"><input autoComplete="new-password" id="cr-new-password" onChange={(event) => { setPassword(event.target.value); setError(''); }} type="password" value={password} /></div>
        <ul className="cr-auth__rules">
          {PASSWORD_RULES.map((rule) => <li className={rule.test(password) ? 'ok' : undefined} key={rule.id}>{rule.label}</li>)}
        </ul>
        <label className="cr-label" htmlFor="cr-confirm-password">Confirm password</label>
        <div className={confirm && confirm !== password ? 'cr-input e' : 'cr-input'}><input autoComplete="new-password" id="cr-confirm-password" onChange={(event) => { setConfirm(event.target.value); setError(''); }} type="password" value={confirm} /></div>
        {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={busy || !password || !confirm} type="submit">{busy ? 'Saving…' : 'Update'}</button>
        </div>
      </form>
    </BottomSheet>
  );
}

function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { account, signOut } = useAppSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!account) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/v1/account', { session: account, method: 'DELETE', body: { confirm: 'DELETE' } });
      await signOut().catch(() => undefined);
      toast.show('Your account was deleted');
      router.push('/anonymous');
    } catch (failure) {
      setError(errorMessage(failure, 'We could not delete your account. Try again.'));
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      description="This permanently deletes your profile, posts, comments, listings, messages and uploaded photos and videos. It can’t be undone."
      onClose={onClose}
      open={open}
      title="Delete your account"
    >
      <label className="cr-label" htmlFor="cr-delete-confirm">Type DELETE to confirm</label>
      <div className="cr-input"><input autoCapitalize="characters" autoComplete="off" id="cr-delete-confirm" onChange={(event) => { setText(event.target.value); setError(''); }} value={text} /></div>
      {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : null}
      <div className="cr-acts">
        <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Cancel</button>
        <button className="cr-pbtn cr-pbtn--l cr-pbtn--danger" disabled={busy || text.trim() !== 'DELETE'} onClick={() => void remove()} type="button">{busy ? 'Deleting…' : 'Delete forever'}</button>
      </div>
    </BottomSheet>
  );
}
