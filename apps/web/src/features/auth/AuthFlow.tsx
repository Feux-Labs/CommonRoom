'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Banner, DotsProgress, Input } from '@/components/cr/primitives';
import { Icon } from '@/components/cr/Icon';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import {
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
  PASSWORD_RULES,
  RESEND_COOLDOWN_SECONDS,
  isValidEmail,
  normaliseUsername,
  passwordMeetsRules,
  usernameProblem,
} from './auth-config';
import { authFailureMessage, describeAuthError, type AuthFailureKind } from './auth-errors';
import { OtpInput } from './OtpInput';
import { GOOGLE_CLIENT_ID, GoogleSignInButton } from './GoogleSignInButton';

export type AuthRoute =
  | 'welcome'
  | 'sign-in'
  | 'sign-up-email'
  | 'sign-up-password'
  | 'sign-up-username'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'session-expired';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

/**
 * Full-screen account flow: welcome, sign in, three-step sign up, email code,
 * password reset and session expiry. Talks to Supabase Auth directly; the parent
 * decides what happens after a successful sign in through onSignedIn.
 */
export function AuthFlow({
  route,
  onRouteChange,
  onClose,
  onSignedIn,
  configured,
  recoverySession = false,
}: {
  route: AuthRoute;
  onRouteChange: (route: AuthRoute) => void;
  onClose: () => void;
  /** Called after sign in, code verification or password reset produced a session. */
  onSignedIn: (notice?: string) => void;
  configured: boolean;
  /** True when the user arrived from a reset link, so no code is needed. */
  recoverySession?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<{ kind: AuthFailureKind; message: string } | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  useEffect(() => {
    if (resendAvailableAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [route]);

  // Is the chosen @username free? Checked a moment after typing stops. State is only set from the
  // async result, so a stale answer for an older name is ignored.
  const [checked, setChecked] = useState<{ handle: string; available: boolean; reason: string | null; unknown: boolean } | null>(null);
  const handleToCheck = normaliseUsername(username);
  const handleValid = route === 'sign-up-username' && Boolean(handleToCheck) && !usernameProblem(username);
  useEffect(() => {
    if (!handleValid) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data } = await getBrowserSupabase().auth.getSession();
          const response = await fetch(`/api/v1/username/check?u=${encodeURIComponent(handleToCheck)}`, {
            headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
          });
          const body = (await response.json()) as { data?: { available: boolean; reason: string | null } };
          if (!active) return;
          if (!response.ok || !body.data) throw new Error('check failed');
          setChecked({ handle: handleToCheck, available: body.data.available, reason: body.data.reason, unknown: false });
        } catch {
          // If the check can't run, don't block sign-up: the server picks a free name on save.
          if (active) setChecked({ handle: handleToCheck, available: true, reason: null, unknown: true });
        }
      })();
    }, 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [handleToCheck, handleValid]);
  const handleStatus: 'idle' | 'checking' | 'available' | 'taken' | 'unknown' = !handleValid
    ? 'idle'
    : checked?.handle !== handleToCheck
      ? 'checking'
      : checked.unknown ? 'unknown' : checked.available ? 'available' : 'taken';

  // Where this person has been inside the account flow, so Back goes to the screen before, and closes the flow (leaving them
  // exactly where they were in the app) when there is nothing before. It never drops them on the welcome screen.
  const trail = useRef<AuthRoute[]>([]);
  const goBack = () => {
    const previous = trail.current.pop();
    if (!previous) { onClose(); return; }
    setFailure(null);
    setFieldError('');
    setNotice('');
    setCode('');
    setShowPassword(false);
    onRouteChange(previous);
  };
  const go = (next: AuthRoute) => {
    trail.current.push(route);
    setFailure(null);
    setFieldError('');
    setNotice('');
    setCode('');
    setShowPassword(false);
    onRouteChange(next);
  };

  const startResendCooldown = () => {
    const at = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setNow(Date.now());
    setResendAvailableAt(at);
  };

  const fail = (error: unknown) => {
    const described = describeAuthError(error);
    setFailure(described);
    return described;
  };

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    setNotice('');
    try {
      await task();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Sign in ----------
  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldError(authFailureMessage('invalid_email'));
      return;
    }
    setFieldError('');
    void run(async () => {
      const { data, error } = await getBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.session) {
        setPassword('');
        onSignedIn();
      }
    });
  };

  const resendFromSignIn = () => {
    void run(async () => {
      const { error } = await getBrowserSupabase().auth.resend({ type: 'signup', email: email.trim() });
      if (error) throw error;
      startResendCooldown();
      go('verify-email');
    });
  };

  const signInWithProvider = (provider: 'apple') => {
    void run(async () => {
      const { error } = await getBrowserSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    });
  };

  // ---------- Sign up ----------
  const continueFromEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldError(authFailureMessage('invalid_email'));
      return;
    }
    go('sign-up-password');
  };

  const continueFromPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordMeetsRules(password)) {
      setFieldError('Your password needs to meet every rule below.');
      return;
    }
    go('sign-up-username');
  };

  const usernameIssue = usernameProblem(username);

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = fullName.trim();
    const handle = normaliseUsername(username);
    if (!name) {
      setFieldError('Enter your full name.');
      return;
    }
    if (!handle || usernameIssue) {
      setFieldError(usernameIssue ?? 'Pick a username.');
      return;
    }
    if (!ageConfirmed) {
      setFieldError('Confirm that you are 18 or older.');
      return;
    }
    setFieldError('');
    void run(async () => {
      const { data, error } = await getBrowserSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name, username: handle, age_eligibility_confirmed: true },
        },
      });
      if (error) throw error;
      // With email confirmation on, Supabase hides existing accounts by returning a user with no identities.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setFailure({ kind: 'account_exists', message: authFailureMessage('account_exists') });
        return;
      }
      if (data.session) {
        setPassword('');
        onSignedIn();
        return;
      }
      startResendCooldown();
      go('verify-email');
    });
  };

  // ---------- Verify email ----------
  const verifyEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== OTP_LENGTH) return;
    void run(async () => {
      const { data, error } = await getBrowserSupabase().auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
      if (error) throw error;
      if (data.session) {
        setPassword('');
        onSignedIn('Your email is verified.');
      }
    });
  };

  const resendSignupCode = () => {
    if (resendSeconds > 0) return;
    void run(async () => {
      const { error } = await getBrowserSupabase().auth.resend({ type: 'signup', email: email.trim() });
      if (error) throw error;
      startResendCooldown();
      setCode('');
      setNotice('We sent a new code.');
    });
  };

  // ---------- Password reset ----------
  const sendResetCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldError(authFailureMessage('invalid_email'));
      return;
    }
    setFieldError('');
    void run(async () => {
      const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      startResendCooldown();
      go('reset-password');
    });
  };

  const resendResetCode = () => {
    if (resendSeconds > 0) return;
    void run(async () => {
      const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      startResendCooldown();
      setCode('');
      setNotice('If an account exists for that email, we sent a new code.');
    });
  };

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const resetPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoverySession && code.length !== OTP_LENGTH) {
      setFieldError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    if (!passwordMeetsRules(password)) {
      setFieldError('Your new password needs at least 8 characters, a number and a letter.');
      return;
    }
    if (password !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }
    setFieldError('');
    void run(async () => {
      const supabase = getBrowserSupabase();
      if (!recoverySession) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
        if (verifyError) throw verifyError;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      onSignedIn('Your password has been updated.');
    });
  };

  // ---------- Rendering ----------
  const disabled = busy || !configured;
  const passwordToggle = {
    rightIcon: (showPassword ? 'eye-off' : 'eye') as 'eye' | 'eye-off',
    rightIconLabel: showPassword ? 'Hide password' : 'Show password',
    onRightIconClick: () => setShowPassword((visible) => !visible),
  };
  const setupBanner = !configured
    ? <Banner variant="info">Accounts are unavailable because the backend is not configured.</Banner>
    : null;
  const failureBanner = failure ? (
    <Banner>
      {failure.message}
      {failure.kind === 'email_not_confirmed' ? (
        <> <button className="cr-auth__inline-action" disabled={disabled} onClick={resendFromSignIn} type="button">Resend code</button></>
      ) : null}
      {failure.kind === 'suspended' && SUPPORT_EMAIL ? (
        <> <a className="cr-auth__inline-action" href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a></>
      ) : null}
      {failure.kind === 'account_exists' ? (
        <> <button className="cr-auth__inline-action" onClick={() => go('sign-in')} type="button">Sign in</button></>
      ) : null}
    </Banner>
  ) : null;
  const noticeBanner = notice ? <Banner variant="info">{notice}</Banner> : null;

  if (route === 'welcome') {
    return (
      <AuthSurface variant="dark">
        <div className="cr-auth__brand-row">
          <span className="cr-auth__brand"><BrandDots light /> common room</span>
          <button aria-label="Close" className="cr-auth__icon-btn" onClick={onClose} type="button"><Icon name="x" /></button>
        </div>
        <WelcomeArt />
        <h1 className="cr-auth__hero-title" ref={headingRef} tabIndex={-1}>Your campus, in one room.</h1>
        <p className="cr-auth__hero-sub">Post to your campus, say things anonymously, and buy and sell with students near you.</p>
        {setupBanner}
        <div className="cr-auth__hero-actions">
          <button className="cr-auth__btn cr-auth__btn--light" disabled={!configured} onClick={() => go('sign-up-email')} type="button">Create account</button>
          <button className="cr-auth__btn cr-auth__btn--outline" disabled={!configured} onClick={() => go('sign-in')} type="button">Sign in</button>
          <p className="cr-auth__legal">By continuing you agree to the <a href="/terms" rel="noopener" target="_blank"><u>Terms</u></a> and <a href="/guidelines" rel="noopener" target="_blank"><u>Community Guidelines</u></a>.</p>
        </div>
      </AuthSurface>
    );
  }

  if (route === 'session-expired') {
    return (
      <AuthSurface>
        <span className="cr-auth__round-icon" aria-hidden="true"><Icon name="clk" /></span>
        <h1 className="cr-auth__title cr-auth__title--center" ref={headingRef} tabIndex={-1}>You were signed out</h1>
        <p className="cr-auth__sub cr-auth__sub--center">Your session expired. Sign in again to continue.</p>
        <button className="cr-auth__btn" onClick={() => go('sign-in')} type="button">Sign in</button>
        <p className="cr-auth__foot"><button className="cr-auth__link" onClick={onClose} type="button">Not now</button></p>
      </AuthSurface>
    );
  }

  const backButton = (
    <button aria-label="Back" className="cr-auth__back" onClick={goBack} type="button">
      <Icon name="back" />
    </button>
  );

  if (route === 'sign-in') {
    return (
      <AuthSurface>
        {backButton}
        <DotsProgress current={1} />
        <Heading refObject={headingRef} title="Welcome back" sub="Sign in to pick up where you left off." />
        {setupBanner}
        {failureBanner}
        <form className="cr-auth__form" noValidate onSubmit={signIn}>
          <Input
            error={Boolean(fieldError) || failure?.kind === 'invalid_credentials'}
            inputProps={{ autoComplete: 'email', name: 'email', required: true }}
            label="Email"
            message={fieldError || undefined}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
            type="email"
            value={email}
          />
          <Input
            error={failure?.kind === 'invalid_credentials'}
            inputProps={{ autoComplete: 'current-password', name: 'password', required: true }}
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            {...passwordToggle}
          />
          <p className="cr-auth__right"><button className="cr-auth__link" onClick={() => go('forgot-password')} type="button">Forgot password?</button></p>
          <SubmitButton busy={busy} disabled={disabled || !email || !password}>Sign in</SubmitButton>
        </form>
        <ProviderButtons context="signin" disabled={disabled} onApple={() => signInWithProvider('apple')} onError={(message) => setFailure({ kind: 'unknown', message })} onSignedIn={() => onSignedIn()} />
        <p className="cr-auth__foot">New to Common Room? <button className="cr-auth__link" onClick={() => go('sign-up-email')} type="button">Create account</button></p>
      </AuthSurface>
    );
  }

  if (route === 'sign-up-email') {
    return (
      <AuthSurface>
        {backButton}
        <DotsProgress current={1} />
        <Heading refObject={headingRef} title="Create your account" sub="Use your school email if you have one." />
        {setupBanner}
        <form className="cr-auth__form" noValidate onSubmit={continueFromEmail}>
          <Input
            error={Boolean(fieldError)}
            inputProps={{ autoComplete: 'email', name: 'email', required: true }}
            label="Email"
            message={fieldError || undefined}
            onChange={(event) => { setEmail(event.target.value); setFieldError(''); }}
            placeholder="you@school.edu"
            type="email"
            value={email}
          />
          <SubmitButton busy={false} disabled={disabled || !email.trim()}>Continue</SubmitButton>
        </form>
        <ProviderButtons context="signup" disabled={disabled} onApple={() => signInWithProvider('apple')} onError={(message) => setFailure({ kind: 'unknown', message })} onSignedIn={() => onSignedIn()} />
        <p className="cr-auth__foot">Already have an account? <button className="cr-auth__link" onClick={() => go('sign-in')} type="button">Sign in</button></p>
      </AuthSurface>
    );
  }

  if (route === 'sign-up-password') {
    return (
      <AuthSurface>
        {backButton}
        <DotsProgress current={2} />
        <Heading refObject={headingRef} title="Set a password" sub="You will use it to sign in." />
        <form className="cr-auth__form" noValidate onSubmit={continueFromPassword}>
          <Input
            error={Boolean(fieldError)}
            inputProps={{ autoComplete: 'new-password', name: 'new-password', required: true, 'aria-describedby': 'cr-password-rules' }}
            label="Password"
            message={fieldError || undefined}
            onChange={(event) => { setPassword(event.target.value); setFieldError(''); }}
            placeholder="Create a password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            {...passwordToggle}
          />
          <PasswordRules value={password} />
          <SubmitButton busy={false} disabled={disabled || !passwordMeetsRules(password)}>Continue</SubmitButton>
        </form>
      </AuthSurface>
    );
  }

  if (route === 'sign-up-username') {
    const handle = normaliseUsername(username);
    return (
      <AuthSurface>
        {backButton}
        <DotsProgress current={3} />
        <Heading refObject={headingRef} title="Pick a username" sub="This is how people find you. You can change it later." />
        {failureBanner}
        <form className="cr-auth__form" noValidate onSubmit={createAccount}>
          <Input
            inputProps={{ autoComplete: 'name', name: 'name', maxLength: 80, required: true }}
            label="Full name"
            onChange={(event) => { setFullName(event.target.value); setFieldError(''); }}
            placeholder="Your name"
            value={fullName}
          />
          <Input
            error={Boolean(usernameIssue) || handleStatus === 'taken'}
            inputProps={{ autoCapitalize: 'none', autoComplete: 'username', name: 'username', maxLength: 31, required: true, spellCheck: false }}
            label="Username"
            message={usernameIssue
              ?? (handleStatus === 'taken' ? 'That username is taken. Try another.'
                : handleStatus === 'checking' ? 'Checking…'
                  : handleStatus === 'available' ? `@${handle} is available`
                    : handle ? `You will appear as @${handle}.` : 'Letters, numbers and underscores.')}
            success={handleStatus === 'available'}
            onChange={(event) => { setUsername(event.target.value.startsWith('@') ? event.target.value : `@${event.target.value}`); setFieldError(''); }}
            placeholder="@username"
            value={username === '@' ? '' : username}
          />
          <label className="cr-auth__check">
            <input checked={ageConfirmed} onChange={(event) => { setAgeConfirmed(event.target.checked); setFieldError(''); }} type="checkbox" />
            <span>I am 18 or older.</span>
          </label>
          {fieldError ? <p className="msg e" role="alert">{fieldError}</p> : null}
          <SubmitButton busy={busy} disabled={disabled || !fullName.trim() || !handle || Boolean(usernameIssue) || handleStatus === 'taken' || handleStatus === 'checking' || !ageConfirmed}>Create account</SubmitButton>
        </form>
        <p className="cr-auth__foot">By continuing you agree to the <a href="/terms" rel="noopener" target="_blank"><u>Terms</u></a> and <a href="/guidelines" rel="noopener" target="_blank"><u>Community Guidelines</u></a>.</p>
      </AuthSurface>
    );
  }

  if (route === 'verify-email') {
    return (
      <AuthSurface>
        {backButton}
        <Heading refObject={headingRef} title="Check your email" sub={`We sent a ${OTP_LENGTH}-digit code to ${email.trim() || 'your email'}.`} />
        {failureBanner}
        {noticeBanner}
        <form className="cr-auth__form" noValidate onSubmit={verifyEmail}>
          <OtpInput autoFocus disabled={busy} invalid={failure?.kind === 'code_invalid'} length={OTP_LENGTH} onChange={(value) => { setCode(value); setFailure(null); }} value={code} />
          <p className="msg">Code expires in {OTP_EXPIRY_MINUTES} minutes.</p>
          <SubmitButton busy={busy} disabled={disabled || code.length !== OTP_LENGTH}>Verify</SubmitButton>
        </form>
        <ResendLine disabled={disabled} onResend={resendSignupCode} seconds={resendSeconds} />
        <p className="cr-auth__foot"><button className="cr-auth__link" onClick={() => go('sign-up-email')} type="button">Use a different email</button></p>
      </AuthSurface>
    );
  }

  if (route === 'forgot-password') {
    return (
      <AuthSurface>
        {backButton}
        <DotsProgress current={1} />
        <Heading refObject={headingRef} title="Reset your password" sub="Enter your email and we will send a reset code." />
        {failureBanner}
        <form className="cr-auth__form" noValidate onSubmit={sendResetCode}>
          <Input
            error={Boolean(fieldError)}
            inputProps={{ autoComplete: 'email', name: 'email', required: true }}
            label="Email"
            message={fieldError || undefined}
            onChange={(event) => { setEmail(event.target.value); setFieldError(''); }}
            placeholder="you@school.edu"
            type="email"
            value={email}
          />
          <SubmitButton busy={busy} disabled={disabled || !email.trim()}>Send code</SubmitButton>
        </form>
        <p className="cr-auth__foot">Remembered it? <button className="cr-auth__link" onClick={() => go('sign-in')} type="button">Sign in</button></p>
      </AuthSurface>
    );
  }

  // reset-password
  return (
    <AuthSurface>
      {backButton}
      <Heading
        refObject={headingRef}
        title="New password"
        sub={recoverySession ? 'Choose a new password for your account.' : 'Enter the code we sent, then choose a new password.'}
      />
      {failureBanner}
      {noticeBanner}
      <form className="cr-auth__form" noValidate onSubmit={resetPassword}>
        {!recoverySession ? (
          <>
            <span className="cr-auth__label" id="cr-reset-code-label">Code</span>
            <OtpInput disabled={busy} invalid={failure?.kind === 'code_invalid'} label="Reset code" length={OTP_LENGTH} onChange={(value) => { setCode(value); setFailure(null); }} value={code} />
          </>
        ) : null}
        <Input
          inputProps={{ autoComplete: 'new-password', name: 'new-password', required: true }}
          label="New password"
          onChange={(event) => { setPassword(event.target.value); setFieldError(''); }}
          placeholder="At least 8 characters"
          type={showPassword ? 'text' : 'password'}
          value={password}
          {...passwordToggle}
        />
        <Input
          error={passwordsMismatch}
          inputProps={{ autoComplete: 'new-password', name: 'confirm-password', required: true }}
          label="Confirm password"
          message={passwordsMismatch ? 'Passwords do not match.' : undefined}
          onChange={(event) => { setConfirmPassword(event.target.value); setFieldError(''); }}
          placeholder="Enter it again"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
        />
        {fieldError ? <p className="msg e" role="alert">{fieldError}</p> : null}
        <SubmitButton busy={busy} disabled={disabled || !password || !confirmPassword || passwordsMismatch}>Update password</SubmitButton>
      </form>
      {!recoverySession ? <ResendLine disabled={disabled} onResend={resendResetCode} seconds={resendSeconds} /> : null}
    </AuthSurface>
  );
}

const APPLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === 'true';
const TIKTOK_ENABLED = process.env.NEXT_PUBLIC_AUTH_TIKTOK_ENABLED === 'true';

function ProviderButtons({
  context,
  disabled,
  onApple,
  onError,
  onSignedIn,
}: {
  context: 'signin' | 'signup';
  disabled: boolean;
  onApple: () => void;
  onError: (message: string) => void;
  onSignedIn: () => void;
}) {
  if (!GOOGLE_CLIENT_ID && !APPLE_ENABLED && !TIKTOK_ENABLED) return null;
  return (
    <div className="cr-auth__providers">
      <span className="cr-auth__divider">or</span>
      <div className="cr-auth__provider-stack">
        <GoogleSignInButton context={context} disabled={disabled} onError={onError} onSignedIn={onSignedIn} />
        {APPLE_ENABLED ? (
          <button className="cr-auth__social" disabled={disabled} onClick={onApple} type="button">
            <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor" /></svg>
            <span>Continue with Apple</span>
          </button>
        ) : null}
        {TIKTOK_ENABLED ? (
          <a aria-disabled={disabled} className="cr-auth__social" href="/api/auth/tiktok/start">
            <span>Continue with TikTok</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AuthSurface({ children, variant = 'light' }: { children: ReactNode; variant?: 'light' | 'dark' }) {
  return (
    <div className="cr-auth" data-variant={variant} role="dialog" aria-modal="true" aria-label="Account">
      <div className="cr-auth__panel">{children}</div>
    </div>
  );
}

function Heading({ title, sub, refObject }: { title: string; sub: string; refObject: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <>
      <h1 className="cr-auth__title" ref={refObject} tabIndex={-1}>{title}</h1>
      <p className="cr-auth__sub">{sub}</p>
    </>
  );
}

function SubmitButton({ busy, disabled, children }: { busy: boolean; disabled: boolean; children: ReactNode }) {
  return (
    <button aria-busy={busy || undefined} className="cr-auth__btn" disabled={disabled} type="submit">
      {busy ? <span aria-hidden="true" className="cr-auth__spinner" /> : null}
      {children}
    </button>
  );
}

function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="cr-auth__rules" id="cr-password-rules">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li className={ok ? 'ok' : undefined} key={rule.id}>
            <span className="cr-visually-hidden">{ok ? 'Met: ' : 'Not met: '}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function ResendLine({ seconds, onResend, disabled }: { seconds: number; onResend: () => void; disabled: boolean }) {
  return (
    <p className="cr-auth__center" aria-live="polite">
      {seconds > 0 ? (
        <span className="cr-auth__muted">Resend code in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      ) : (
        <button className="cr-auth__link" disabled={disabled} onClick={onResend} type="button">Resend code</button>
      )}
    </p>
  );
}

function BrandDots({ light = false }: { light?: boolean }) {
  return (
    <span aria-hidden="true" className={light ? 'cr-brand-dots cr-brand-dots--light' : 'cr-brand-dots'}>
      <i /><i /><i />
    </span>
  );
}

function WelcomeArt() {
  return (
    <div aria-hidden="true" className="cr-auth__art">
      <span className="cr-auth__art-disc" />
      <span className="cr-auth__art-ring" />
      <span className="cr-auth__art-square" />
      <span className="cr-auth__art-chip" />
      <span className="cr-auth__art-dot" />
      <span className="cr-auth__art-face"><Icon name="anon" /></span>
    </div>
  );
}
