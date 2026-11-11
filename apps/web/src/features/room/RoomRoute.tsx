'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoomExperience } from '@/components/RoomExperience';
import { Icon } from '@/components/cr/Icon';
import { useToast } from '@/components/cr/Toast';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { apiRequest } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { ROOM_ENABLED } from '@/lib/features';
import { NotificationsPanel, type NotificationsPayload } from '@/features/notifications/NotificationsScreen';

/**
 * Room renders the existing RoomExperience (its design is kept); this wrapper connects
 * it to the shared session and routes, and adds an always-visible create button.
 */
export function RoomRoute({ focusPostId = null }: { focusPostId?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { ready, session, profile, isGuest, requireAccount } = useAppSession();
  const [refreshToken] = useState(0);
  const [unread, setUnread] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // A dot on the bell when something new is waiting. Signed-in accounts only; failures just hide the dot.
  useEffect(() => {
    if (!ready || !session || isGuest) return;
    let active = true;
    void (async () => {
      try {
        const payload = await apiRequest<NotificationsPayload>('/api/v1/notifications?limit=1', { session });
        if (active) setUnread(payload.unread > 0);
      } catch {
        if (active) setUnread(false);
      }
    })();
    return () => { active = false; };
  }, [ready, session, isGuest]);

  if (!ROOM_ENABLED) {
    return (
      <AppShell active={null}>
        <main className="cr-boot" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Room is resting</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>We’re focusing on Anonymous and Market for now. Room will be back.</p>
          <button className="cr-pbtn cr-pbtn--l" onClick={() => router.push('/anonymous')} type="button">Go to Anonymous</button>
        </main>
      </AppShell>
    );
  }

  if (!ready) return <AppShell active="Room"><BootScreen /></AppShell>;

  return (
    <AppShell active="Room">
      <RoomExperience
        accessToken={session?.access_token ?? ''}
        focusPostId={focusPostId}
        hasUnreadNotifications={unread}
        initialFeedSection="For You"
        isGuest={isGuest}
        onCreate={() => {
          if (requireAccount('sign-up-email')) router.push('/create');
        }}
        onError={(message) => toast.show(message, 'error')}
        onNotice={(message) => toast.show(message)}
        onOpenAccountMenu={() => (isGuest ? requireAccount('sign-in') : router.push('/me'))}
        onOpenNotifications={() => { if (isGuest) requireAccount('sign-in'); else setPanelOpen((open) => !open); }}
        onOpenProfile={() => (isGuest ? requireAccount('sign-in') : router.push('/me'))}
        onOpenSearch={() => router.push('/search')}
        onRequireAccount={() => requireAccount('sign-in')}
        profile={{
          id: profile?.id ?? session?.user.id ?? 'guest',
          displayName: profile?.displayName ?? 'Guest',
          username: profile?.username ?? null,
          school: profile?.school ?? null,
        }}
        refreshToken={refreshToken}
        theme="light"
      />
      {panelOpen ? <NotificationsPanel onClose={() => setPanelOpen(false)} onSeen={() => setUnread(false)} /> : null}
      <button aria-label="New post" className="cr-fab" onClick={() => { if (requireAccount('sign-up-email')) router.push('/create'); }} type="button"><Icon name="plus" /></button>
    </AppShell>
  );
}
