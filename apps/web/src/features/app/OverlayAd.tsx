'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SponsoredCard, type Ad } from '@/features/anonymous/SponsoredCard';
import { apiRequest } from './api';
import { useAppSession } from './AppSession';
import './overlay-ad.css';

const LAST_KEY = 'commonroom:overlay-at';
const FIRST_AFTER_MS = 75_000;
const EVERY_MS = 6 * 3_600_000;
const QUIET_PREFIXES = ['/create', '/admin', '/payments', '/advertise', '/help', '/pro', '/levels', '/rank-rules', '/terms', '/privacy', '/guidelines'];

/**
 * A full-screen sponsored message, shown rarely: once the person has used the app for a little over a minute, and at most
 * once every six hours on a device. It can be closed after three seconds. Pro members never get it (the server sends nothing
 * to them), and it stays out of the way on screens where someone is writing, paying or reading the rules.
 */
export function OverlayAd() {
  const { ready, session } = useAppSession();
  const path = usePathname();
  const [ad, setAd] = useState<Ad | null>(null);
  const [wait, setWait] = useState(3);
  const quiet = QUIET_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) || path.startsWith('/anonymous/inbox/');

  useEffect(() => {
    if (!ready || !session || quiet || ad) return;
    let last = 0;
    try { last = Number(window.localStorage.getItem(LAST_KEY)) || 0; } catch { /* storage blocked: still rare, because of the delay */ }
    const delay = Math.max(FIRST_AFTER_MS, last + EVERY_MS - Date.now());
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await apiRequest<Ad | null>('/api/v1/ads?placement=overlay', { session });
          if (!active || !found) return;
          try { window.localStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* ignore */ }
          setAd(found);
        } catch { /* no ad is fine */ }
      })();
    }, delay);
    return () => { active = false; window.clearTimeout(timer); };
  }, [ad, quiet, ready, session]);

  useEffect(() => {
    if (!ad) return;
    const tick = window.setInterval(() => setWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(tick);
  }, [ad]);

  if (!ad) return null;
  return (
    <div aria-label="Sponsored message" aria-modal="true" className="cr-overlay" role="dialog">
      <div className="cr-overlay__box">
        <SponsoredCard ad={ad} session={session} />
        <button className="cr-overlay__close" disabled={wait > 0} onClick={() => setAd(null)} type="button">{wait > 0 ? `Close in ${wait}…` : 'Close'}</button>
      </div>
    </div>
  );
}
