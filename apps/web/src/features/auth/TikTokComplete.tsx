'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { getBrowserSupabase } from '@/lib/supabase-browser';

const MESSAGES: Record<string, string> = {
  not_configured: 'Sign in with TikTok isn’t available yet.',
  cancelled: 'You cancelled the TikTok sign-in.',
  invalid_state: 'That sign-in link expired or was already used. Please try again.',
  failed: 'We couldn’t sign you in with TikTok. Please try again.',
};

/** Where the TikTok login lands: stores the new session, then takes the person into the app. */
export function TikTokComplete() {
  const params = useSearchParams();
  const error = params.get('error');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (error) return;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    if (!accessToken || !refreshToken) { setTimeout(() => setFailed(true), 0); return; }
    let active = true;
    void (async () => {
      const { error: sessionError } = await getBrowserSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (!active) return;
      if (sessionError) { setFailed(true); return; }
      // Remove the tokens from the address bar, then go to the app (new accounts continue into sign-up details).
      window.history.replaceState(null, '', '/auth/tiktok-complete');
      window.location.replace('/anonymous');
    })();
    return () => { active = false; };
  }, [error]);

  if (error || failed) {
    return (
      <main className="cr-screen">
        <StateBlock
          actions={<Link className="cr-pbtn cr-pbtn--l" href="/anonymous">Back to Common Room</Link>}
          description={MESSAGES[error ?? 'failed'] ?? MESSAGES.failed}
          icon="warn"
          role="alert"
          title="TikTok sign-in didn’t finish"
        />
      </main>
    );
  }
  return (
    <main className="cr-screen">
      <StateBlock description="One moment while we sign you in." icon="user" title="Signing you in…" />
    </main>
  );
}
