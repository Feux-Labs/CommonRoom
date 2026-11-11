'use client';

import type { Session } from '@supabase/supabase-js';

const SOURCE_KEY = 'commonroom:source';

/** Remembers the first ?s= tag a person arrived with (for example ?s=tiktok). Later visits never overwrite it. */
export function captureSource(): void {
  try {
    if (window.localStorage.getItem(SOURCE_KEY)) return;
    const tag = new URLSearchParams(window.location.search).get('s');
    if (tag && /^[a-z0-9_-]{1,32}$/i.test(tag)) window.localStorage.setItem(SOURCE_KEY, tag.toLowerCase());
  } catch { /* storage blocked: sources are best effort */ }
}

function storedSource(): string | null {
  try { return window.localStorage.getItem(SOURCE_KEY); } catch { return null; }
}

export type TrackedEvent = 'app_open' | 'post_view' | 'post_share' | 'profile_view' | 'listing_view' | 'nudge_click' | 'ad_view' | 'ad_click';

/** Fire and forget. Analytics must never get in the way of the app, so every failure is swallowed. */
export function trackEvent(session: Pick<Session, 'access_token'> | null, event: TrackedEvent, target?: { kind: 'room' | 'anonymous' | 'listing' | 'profile' | 'ad'; id: string }): void {
  if (!session) return;
  void fetch('/api/v1/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ event, targetKind: target?.kind, targetId: target?.id, source: storedSource() }),
  }).catch(() => undefined);
}
