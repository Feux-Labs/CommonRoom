'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import type { AnonIdentity } from './api';
import { ANON_ID_MAX, anonymousIdProblem, generateAnonymousId } from './names';

type Step = 'ask' | 'restore' | 'create' | 'code';

/** The recovery code, big and easy to copy. Shown once, when an ID is made or a new code is asked for. */
export function RecoveryCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* the code is on screen to copy by hand */ }
  };
  return (
    <div className="cr-recovery">
      <p aria-label="Your recovery code" className="cr-recovery__code">{code}</p>
      <button className="cr-ghost cr-ghost--l" onClick={() => void copy()} type="button">{copied ? 'Copied' : 'Copy code'}</button>
    </div>
  );
}

/**
 * Your Anonymous ID: the name used for anonymous posts, comments and messages. First we ask whether you already have one
 * (then ID + recovery code brings back your posts, chats and history), otherwise we make one for you. It is never linked to your profile.
 */
function AnonymousNameSheetBody({ open, onClose, onSaved, startAt = 'ask', replacing = false }: { open: boolean; onClose: () => void; onSaved: (identity: AnonIdentity) => void; startAt?: 'ask' | 'restore'; replacing?: boolean }) {
  const { session } = useAppSession();
  const [step, setStep] = useState<Step>(startAt);
  const [handle, setHandle] = useState(() => generateAnonymousId());
  const [existingId, setExistingId] = useState('');
  const [code, setCode] = useState('');
  const [created, setCreated] = useState<{ identity: AnonIdentity; code: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = handle.trim();
    if (!session || busy) return;
    const problem = anonymousIdProblem(value);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<AnonIdentity & { recovery_code?: string | null }>('/api/v1/anonymous/identity', { session, method: 'POST', body: { handle: value } });
      if (result.recovery_code) {
        setCreated({ identity: { handle: result.handle, created_at: result.created_at }, code: result.recovery_code });
        setStep('code');
        setBusy(false);
      } else {
        onSaved({ handle: result.handle, created_at: result.created_at });
      }
    } catch (saveError) {
      setError(errorMessage(saveError, 'That ID could not be saved. Try another.'));
      setBusy(false);
    }
  };

  const restore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || busy) return;
    if (!existingId.trim() || !code.trim()) {
      setError('Enter your Anonymous ID and your recovery code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ handle: string }>('/api/v1/anonymous/identity/restore', { session, method: 'POST', body: { handle: existingId.trim(), code: code.trim(), replace: replacing || undefined } });
      try { window.sessionStorage.setItem(`commonroom:anon-confirmed:${session.user.id}`, '1'); } catch { /* storage unavailable */ }
      // Everything that belonged to the ID is now here: reload so posts, chats and history all show up.
      window.location.reload();
      void result;
    } catch (restoreError) {
      setError(errorMessage(restoreError, 'That ID could not be restored.'));
      setBusy(false);
    }
  };

  const titles: Record<Step, string> = { ask: 'Your Anonymous ID', restore: 'Welcome back', create: 'Your Anonymous ID', code: 'Save your recovery code' };
  const descriptions: Record<Step, string> = {
    ask: 'This is the name you use when you post, comment or message anonymously. It is never linked to your profile.',
    restore: replacing ? 'Enter the ID you want to use and its recovery code. Your posts and chats come with it. This replaces the ID on this phone.' : 'Enter your ID and the recovery code you saved. Your posts, chats and history come back.',
    create: 'We picked one for you. Edit it if you like.',
    code: 'This code is the only way to get this ID back on another phone. We show it once. Keep it private.',
  };

  return (
    <BottomSheet description={descriptions[step]} onClose={onClose} open={open} title={titles[step]}>
      {step === 'ask' ? (
        <>
          <p className="cr-note"><b>Do you have an Anonymous ID?</b></p>
          <div className="cr-acts">
            <button className="cr-ghost cr-ghost--l" onClick={() => setStep('create')} type="button">No, make me one</button>
            <button className="cr-pbtn cr-pbtn--l" onClick={() => { setError(''); setStep('restore'); }} type="button">Yes, I have one</button>
          </div>
        </>
      ) : null}

      {step === 'restore' ? (
        <form noValidate onSubmit={(event) => void restore(event)}>
          <label className="cr-label" htmlFor="cr-anon-existing">Your Anonymous ID</label>
          <div className={error ? 'cr-input e' : 'cr-input'}>
            <input autoCapitalize="none" autoComplete="off" id="cr-anon-existing" maxLength={ANON_ID_MAX} onChange={(event) => { setExistingId(event.target.value.replace(/\s/g, '')); setError(''); }} spellCheck={false} value={existingId} />
          </div>
          <label className="cr-label" htmlFor="cr-anon-code">Recovery code</label>
          <div className={error ? 'cr-input e' : 'cr-input'}>
            <input autoCapitalize="characters" autoComplete="off" id="cr-anon-code" maxLength={20} onChange={(event) => { setCode(event.target.value); setError(''); }} placeholder="ABCD-EFGH-JKLM" spellCheck={false} value={code} />
          </div>
          {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : <p className="cr-msg">Lost your code? You can make a new ID instead.</p>}
          <div className="cr-acts">
            <button className="cr-ghost cr-ghost--l" onClick={() => { setError(''); if (startAt === 'restore') onClose(); else setStep('ask'); }} type="button">{startAt === 'restore' ? 'Cancel' : 'Back'}</button>
            <button className="cr-pbtn cr-pbtn--l" disabled={busy} type="submit">{busy ? 'Restoring…' : 'Restore my ID'}</button>
          </div>
          {startAt !== 'restore' ? <p className="cr-note"><button className="cr-link" onClick={() => { setError(''); setStep('create'); }} type="button">I do not have my code. Make a new ID</button></p> : null}
        </form>
      ) : null}

      {step === 'create' ? (
        <form noValidate onSubmit={(event) => void save(event)}>
          <label className="cr-label" htmlFor="cr-anon-handle">Anonymous ID</label>
          <div className={error ? 'cr-input e' : 'cr-input'}>
            <input autoCapitalize="none" autoComplete="off" id="cr-anon-handle" maxLength={ANON_ID_MAX} onChange={(event) => { setHandle(event.target.value.replace(/\s/g, '')); setError(''); }} spellCheck={false} value={handle} />
            <button className="cr-link" onClick={() => { setHandle(generateAnonymousId()); setError(''); }} type="button">Roll another</button>
          </div>
          {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : <p className="cr-msg">Letters, numbers and underscores. You can change it later.</p>}
          <div className="cr-acts">
            <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Cancel</button>
            <button className="cr-pbtn cr-pbtn--l" disabled={busy || !handle.trim()} type="submit">{busy ? 'Saving…' : 'Continue'}</button>
          </div>
        </form>
      ) : null}

      {step === 'code' && created ? (
        <>
          <p className="cr-note">Your ID is <b>{created.identity.handle}</b>.</p>
          <RecoveryCodeBox code={created.code} />
          <label className="cr-auth__check" style={{ marginTop: 10 }}>
            <input checked={saved} onChange={(event) => setSaved(event.target.checked)} type="checkbox" />
            <span>I saved my recovery code.</span>
          </label>
          <div className="cr-acts">
            <button className="cr-pbtn cr-pbtn--l" disabled={!saved} onClick={() => onSaved(created.identity)} type="button">Continue</button>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}

type AnonymousNameSheetProps = Parameters<typeof AnonymousNameSheetBody>[0];

/** Mounted only while open, so every opening starts with fresh state and nothing needs resetting. */
export function AnonymousNameSheet(props: AnonymousNameSheetProps) {
  return props.open ? <AnonymousNameSheetBody {...props} /> : null;
}
