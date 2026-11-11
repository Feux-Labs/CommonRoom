'use client';

import { useState, useSyncExternalStore } from 'react';
import { useAppSession } from './AppSession';
import './sign-in-nudge.css';

const KEY = 'commonroom:nudge';
const DAY = 86_400_000;
// Each dismissal waits longer before the next ask: 3, 7, then 14 days.
const WAITS = [3 * DAY, 7 * DAY, 14 * DAY];

type NudgeState = { dismissals: number; last: number };

function read(): NudgeState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { dismissals: 0, last: 0 };
    const parsed = JSON.parse(raw) as Partial<NudgeState>;
    return { dismissals: Number(parsed.dismissals) || 0, last: Number(parsed.last) || 0 };
  } catch {
    return { dismissals: 0, last: 0 };
  }
}

const subscribe = () => () => undefined;

/** A small, dismissible reminder for guests: signing in is optional, and comes back only now and then. */
export function SignInNudge() {
  const { ready, isGuest, openAuth } = useAppSession();
  const [hidden, setHidden] = useState(false);
  // Browser-only read: false on the server and first paint, so hydration matches.
  const due = useSyncExternalStore(subscribe, () => {
    const state = read();
    return state.dismissals === 0 && state.last === 0 ? true : Date.now() - state.last >= WAITS[Math.min(state.dismissals - 1, WAITS.length - 1)];
  }, () => false);

  if (!ready || !isGuest || hidden || !due) return null;

  const dismiss = () => {
    const state = read();
    try { window.localStorage.setItem(KEY, JSON.stringify({ dismissals: state.dismissals + 1, last: Date.now() })); } catch { /* storage blocked: it just asks again next visit */ }
    setHidden(true);
  };

  return (
    <aside aria-label="Account suggestion" className="cr-nudge">
      <p>Get the best out of Common Room: sell on Market, keep your inbox, unlock Room.</p>
      <div className="cr-nudge__acts">
        <button className="cr-nudge__go" onClick={() => { dismiss(); openAuth('sign-in'); }} type="button">Join</button>
        <button className="cr-nudge__later" onClick={dismiss} type="button">Later</button>
      </div>
    </aside>
  );
}
