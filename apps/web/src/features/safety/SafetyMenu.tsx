'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { useToast } from '@/components/cr/Toast';
import { ApiError, apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';

type Relationship = { blocked: boolean; muted: boolean };

/** Block / mute choices for one person. Opens from the "more" button on their profile. */
export function SafetyMenu({ open, onClose, onReport, userId, name }: { open: boolean; onClose: () => void; onReport?: () => void; userId: string; name: string }) {
  // The sheet content only exists while open, so it always starts fresh and loads the current state.
  return open ? <SafetyMenuBody name={name} onClose={onClose} onReport={onReport} userId={userId} /> : null;
}

function SafetyMenuBody({ onClose, onReport, userId, name }: { onClose: () => void; onReport?: () => void; userId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const { account } = useAppSession();
  const [state, setState] = useState<Relationship | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!account) return;
    let active = true;
    void (async () => {
      try {
        const relationship = await apiRequest<Relationship>(`/api/v1/safety/relationship/${userId}`, { session: account });
        if (active) setState(relationship);
      } catch {
        if (active) setState({ blocked: false, muted: false });
      }
    })();
    return () => { active = false; };
  }, [account, userId]);

  const change = async (kind: 'blocks' | 'mutes', on: boolean) => {
    if (!account || busy) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/safety/${kind}`, { session: account, method: on ? 'POST' : 'DELETE', body: { userId } });
      if (kind === 'blocks' && on) {
        toast.show(`${name} is blocked`);
        onClose();
        router.back();
        return;
      }
      setState((current) => (current ? { ...current, [kind === 'blocks' ? 'blocked' : 'muted']: on } : current));
      toast.show(kind === 'mutes' ? (on ? `${name} is muted` : `${name} is unmuted`) : `${name} is unblocked`);
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : errorMessage(error, 'That didn’t work. Try again.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet context={name} onClose={onClose} open title="Safety">
      <div className="cr-safety">
        <button className="cr-row-btn" disabled={busy || !state} onClick={() => void change('mutes', !state?.muted)} type="button">
          <span className="cr-row-btn__main">
            <span className="cr-row-btn__title">{state?.muted ? `Unmute ${name}` : `Mute ${name}`}</span>
            <span className="cr-row-btn__sub">{state?.muted ? 'Their posts and comments will show for you again.' : 'You won’t see their posts or comments. They aren’t told.'}</span>
          </span>
        </button>
        {onReport ? (
          <button className="cr-row-btn" onClick={() => { onClose(); onReport(); }} type="button">
            <span className="cr-row-btn__main">
              <span className="cr-row-btn__title">{`Report ${name}`}</span>
              <span className="cr-row-btn__sub">Tell us if this profile breaks the rules. Your report is anonymous.</span>
            </span>
          </button>
        ) : null}
        <button className="cr-row-btn cr-row-btn--danger" disabled={busy || !state} onClick={() => void change('blocks', !state?.blocked)} type="button">
          <span className="cr-row-btn__main">
            <span className="cr-row-btn__title">{state?.blocked ? `Unblock ${name}` : `Block ${name}`}</span>
            <span className="cr-row-btn__sub">{state?.blocked ? 'They will be able to see and follow you again.' : 'Neither of you will see the other’s posts or profile, and you can’t follow or message each other.'}</span>
          </span>
        </button>
      </div>
    </BottomSheet>
  );
}
