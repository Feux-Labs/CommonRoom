'use client';

import { useEffect, useState } from 'react';
import './install-prompt.css';

const VISITS_KEY = 'commonroom:visits';
const DISMISSED_KEY = 'commonroom:install-dismissed';
const COOLDOWN = 14 * 86_400_000;

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

/**
 * "Add to home screen", offered from a person's second visit. Android Chrome shows its own install dialog when they tap
 * Add; iPhones have no such dialog, so they get the two-step instruction instead. Dismissing hides it for two weeks.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        if (isStandalone()) return;
        // Count one visit per browser session.
        let visits = Number(window.localStorage.getItem(VISITS_KEY)) || 0;
        if (!window.sessionStorage.getItem('commonroom:visit-counted')) {
          window.sessionStorage.setItem('commonroom:visit-counted', '1');
          visits += 1;
          window.localStorage.setItem(VISITS_KEY, String(visits));
        }
        const dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY)) || 0;
        if (visits < 2 || Date.now() - dismissedAt < COOLDOWN) return;
        setEligible(true);
        setIos(isIosSafari());
      } catch { /* storage blocked: never nag */ }
    })();

    const onPrompt = (installEvent: Event) => {
      installEvent.preventDefault();
      setEvent(installEvent as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => { active = false; window.removeEventListener('beforeinstallprompt', onPrompt); };
  }, []);

  if (!eligible || hidden || (!event && !ios)) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };
  const install = async () => {
    if (!event) return;
    await event.prompt().catch(() => undefined);
    await event.userChoice.catch(() => undefined);
    dismiss();
  };

  return (
    <aside aria-label="Install Common Room" className="cr-install">
      <span aria-hidden="true" className="cr-brand-dots cr-brand-dots--light"><i /><i /><i /></span>
      <p>{event ? 'Add Common Room to your home screen: one tap to open, like an app.' : 'Add Common Room to your home screen: tap Share, then “Add to Home Screen”.'}</p>
      <div className="cr-install__acts">
        {event ? <button className="cr-install__go" onClick={() => void install()} type="button">Add</button> : null}
        <button className="cr-install__later" onClick={dismiss} type="button">{event ? 'Not now' : 'Got it'}</button>
      </div>
    </aside>
  );
}
