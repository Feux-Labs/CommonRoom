'use client';

import { useEffect, useState } from 'react';
import './install-prompt.css';

const VISITS_KEY = 'commonroom:visits';
const DISMISSED_KEY = 'commonroom:install-dismissed';
const COOLDOWN = 3 * 86_400_000;

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Kind = 'android' | 'ios' | 'ios-webview';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Any iPhone or iPad browser (Safari, Chrome, Firefox…) can add a site to the home screen. In-app browsers (Instagram, Facebook, TikTok…) cannot. */
function iosKind(): Kind | null {
  const ua = navigator.userAgent;
  const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (!/iphone|ipad|ipod/i.test(ua) && !ipad) return null;
  return /FBAN|FBAV|Instagram|TikTok|Snapchat|Line\/|MicroMessenger|Twitter/i.test(ua) ? 'ios-webview' : 'ios';
}

/**
 * A small drop-down from the top: "Install Common Room". On Android the Install button opens the browser's own install dialog.
 * iPhones have no such dialog, so Install opens the short steps (Share, then Add to Home Screen). Offered from the second visit;
 * closing it hides it for three days.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState<Kind | null>(null);
  const [eligible, setEligible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [steps, setSteps] = useState(false);

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
        setIos(iosKind());
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
    if (event) {
      await event.prompt().catch(() => undefined);
      await event.userChoice.catch(() => undefined);
      dismiss();
      return;
    }
    setSteps((open) => !open);
  };

  return (
    <aside aria-label="Install Common Room" className="cr-install">
      <div className="cr-install__bar">
        <span aria-hidden="true" className="cr-brand-dots cr-brand-dots--light"><i /><i /><i /></span>
        <p><b>Install Common Room</b><small>Open it like an app, right from your home screen.</small></p>
        {ios === 'ios-webview' && !event ? null : (
          <button aria-expanded={event ? undefined : steps} className="cr-install__go" onClick={() => void install()} type="button">{event ? 'Install' : steps ? 'Hide' : 'Install'}</button>
        )}
        <button aria-label="Close" className="cr-install__x" onClick={dismiss} type="button">×</button>
      </div>
      {!event && ios === 'ios' && steps ? (
        <ol className="cr-install__steps">
          <li>Tap the <b>Share</b> button <span aria-hidden="true" className="cr-install__share">⬆︎</span> (at the bottom or top of your browser).</li>
          <li>Scroll and choose <b>Add to Home Screen</b>.</li>
          <li>Tap <b>Add</b>. Common Room is now on your home screen.</li>
        </ol>
      ) : null}
      {ios === 'ios-webview' && !event ? <p className="cr-install__note">Open this page in Safari to add it to your home screen.</p> : null}
    </aside>
  );
}
