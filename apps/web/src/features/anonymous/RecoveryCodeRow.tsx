'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { errorMessage } from '@/features/app/api';
import { RecoveryCodeBox } from './AnonymousNameSheet';
import { anonRequest } from './api';

/** A row in the Inbox: get (or renew) the recovery code that brings your Anonymous ID back on another phone. */
export function RecoveryCodeRow({ session }: { session: Session | null }) {
  const [hasCode, setHasCode] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      try {
        const status = await anonRequest<{ hasCode: boolean }>(session, '/identity/recovery-code');
        if (active) setHasCode(status.hasCode);
      } catch { /* no row if it cannot be checked */ }
    })();
    return () => { active = false; };
    // Check when the person changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const make = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await anonRequest<{ code: string }>(session, '/identity/recovery-code', 'POST');
      setCode(result.code);
      setHasCode(true);
    } catch (makeError) {
      setError(errorMessage(makeError, 'Your recovery code could not be made.'));
    } finally {
      setBusy(false);
    }
  };

  if (hasCode === null) return null;
  return (
    <>
      <button className="cr-row-btn" onClick={() => void make()} type="button">
        <span className="cr-row-btn__main">
          <span className="cr-row-btn__title">{hasCode ? 'Make a new recovery code' : 'Save your recovery code'}</span>
          <span className="cr-row-btn__sub">{hasCode ? 'The old code stops working.' : 'It brings your ID, posts and chats back on another phone.'}</span>
        </span>
      </button>
      {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : null}
      <BottomSheet description="This code is the only way to get this ID back on another phone. We show it once. Keep it private." onClose={() => setCode(null)} open={Boolean(code)} title="Your recovery code">
        {code ? <RecoveryCodeBox code={code} /> : null}
        <div className="cr-acts"><button className="cr-pbtn cr-pbtn--l" onClick={() => setCode(null)} type="button">I saved it</button></div>
      </BottomSheet>
    </>
  );
}
