'use client';

import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, type BottomNavItemLabel } from '@/components/cr/primitives';
import { ROOM_ENABLED } from '@/lib/features';
import { useFlag, useFlagState } from '@/lib/use-flags';
import { useAppSession } from './AppSession';
import { InstallPrompt } from './InstallPrompt';
import { RankNotices } from '@/features/pro/RankNotices';
import { OverlayAd } from './OverlayAd';
import { SignInNudge } from './SignInNudge';

const ROUTES: Record<BottomNavItemLabel, string> = {
  Room: '/room',
  Anonymous: '/anonymous',
  Market: '/marketplace',
  Me: '/me',
};

/** Page frame with the four-tab bottom navigation (Anonymous, Room, Market, Me). "Me" asks guests to sign in. */
export function AppShell({ active, children, hideNav = false }: { active: BottomNavItemLabel | null; children: ReactNode; hideNav?: boolean }) {
  const router = useRouter();
  const { isGuest, openAuth, ready } = useAppSession();
  const roomFlag = useFlag('room_tab');
  const marketFlag = useFlag('market_tab');
  const nudgeFlag = useFlag('signin_nudge');
  const roomState = useFlagState('room_tab');
  const marketState = useFlagState('market_tab');
  // A switched-off part of the app shows a calm "coming back" page at its own address too, not just a hidden tab.
  const gated = active === 'Room' ? roomState : active === 'Market' ? marketState : null;
  const closedName = active === 'Room' ? 'Room' : 'Market';
  const content = gated === null || (gated.loaded && gated.enabled) ? children : gated.loaded ? (
    <main className="cr-boot" style={{ flexDirection: 'column', gap: 10, textAlign: 'center', padding: 24 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>{closedName} is resting</h1>
      <p style={{ margin: 0, opacity: 0.75 }}>We are focusing on Anonymous for now. {closedName} will be back.</p>
      <button className="cr-pbtn cr-pbtn--l" onClick={() => router.push('/anonymous')} type="button">Go to Anonymous</button>
    </main>
  ) : <BootScreen />;

  return (
    <div className="cr-app">
      {content}
      {hideNav ? null : <InstallPrompt />}
      {hideNav ? null : <RankNotices />}
      {hideNav ? null : <Suspense fallback={null}><OverlayAd /></Suspense>}
      {hideNav || !nudgeFlag ? null : <SignInNudge />}
      {hideNav ? null : (
        <BottomNav
          active={active}
          showRoom={ROOM_ENABLED && roomFlag}
          showMarket={marketFlag}
          onNavigate={(item) => {
            if (item === 'Me' && ready && isGuest) {
              openAuth('sign-in');
              return;
            }
            router.push(ROUTES[item]);
          }}
        />
      )}
    </div>
  );
}

export function BootScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="cr-boot" role="status">
      <span aria-hidden="true" className="cr-brand-dots"><i /><i /><i /></span>
    </div>
  );
}
