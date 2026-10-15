'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

function InviteContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [message, setMessage] = useState('Opening your invite…');

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = getBrowserSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setMessage('Sign in on Common Room, then open this invite again.');
        return;
      }
      const response = await fetch('/api/v1/invites/redeem', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      const result = await response.json().catch(() => null) as { data?: { friendName?: string }; error?: { message?: string } } | null;
      if (!active) return;
      if (!response.ok) {
        setMessage(result?.error?.message ?? 'This invite could not be used.');
        return;
      }
      setMessage(`You’re now connected with ${result?.data?.friendName ?? 'your friend'}.`);
      window.setTimeout(() => { window.location.href = '/'; }, 1200);
    })();
    return () => { active = false; };
  }, [code]);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p>{message}</p>
        <a className="text-link" href="/">Back to Common Room</a>
      </div>
    </main>
  );
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card">
            <p>Opening your invite…</p>
          </div>
        </main>
      }
    >
      <InviteContent params={params} />
    </Suspense>
  );
}
