'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BottomSheet } from '@/components/cr/BottomSheet';
import './age-gate.css';

/**
 * The quick "vibe check" shown once, the first time someone posts, likes, comments or messages. One tick says they
 * are 18 or older and accept the terms. It is saved on the server, so it is never asked again.
 */
export function AgeGate({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  // Mounted only while open, so it always starts unticked.
  return open ? <AgeGateBody onClose={onClose} onConfirm={onConfirm} /> : null;
}

function AgeGateBody({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!ticked || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError('That didn’t save. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <BottomSheet onClose={onClose} open title="Quick vibe check">
      <div className="cr-age">
        <div aria-hidden="true" className="cr-age__dots"><i /><i /><i /></div>
        <p className="cr-age__lead">Common Room is for grown-ups, 18 and over.</p>
        <p className="cr-age__sub">Tick the box once and the fun is yours: post, like, comment and send messages. We’ll never ask again.</p>
        <label className="cr-age__check">
          <input checked={ticked} onChange={(event) => setTicked(event.target.checked)} type="checkbox" />
          <span>
            I’m 18 or older and I agree to the <Link href="/terms" target="_blank">Terms</Link> and <Link href="/guidelines" target="_blank">Community Guidelines</Link>.
          </span>
        </label>
        {error ? <p className="cr-age__error" role="alert">{error}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={onClose} type="button">Not now</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={!ticked || busy} onClick={() => void confirm()} type="button">{busy ? 'One sec…' : 'Let’s go'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
