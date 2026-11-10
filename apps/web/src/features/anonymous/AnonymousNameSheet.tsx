'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import type { AnonIdentity } from './api';
import { ANON_ID_MAX, anonymousIdProblem, generateAnonymousId } from './names';

/**
 * Your Anonymous ID: the name used for anonymous posts, comments and messages.
 * We pick one for you; you can edit it or roll another. It is never linked to your profile.
 */
function AnonymousNameSheetBody({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (identity: AnonIdentity) => void }) {
  const { session } = useAppSession();
  const [handle, setHandle] = useState(() => generateAnonymousId());
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
      const saved = await apiRequest<AnonIdentity>('/api/v1/anonymous/identity', { session, method: 'POST', body: { handle: value } });
      onSaved(saved);
    } catch (saveError) {
      setError(errorMessage(saveError, 'That ID could not be saved. Try another.'));
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      description="This is the name you use when you post, comment or message anonymously. We picked one for you. Edit it if you like. It is never linked to your profile."
      onClose={onClose}
      open={open}
      title="Your Anonymous ID"
    >
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
    </BottomSheet>
  );
}

type AnonymousNameSheetProps = Parameters<typeof AnonymousNameSheetBody>[0];

/** Mounted only while open, so every opening starts with fresh state and nothing needs resetting. */
export function AnonymousNameSheet(props: AnonymousNameSheetProps) {
  return props.open ? <AnonymousNameSheetBody {...props} /> : null;
}
