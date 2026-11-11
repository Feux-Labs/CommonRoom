'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, type BottomNavItemLabel } from '@/components/cr/primitives';
import { ROOM_ENABLED } from '@/lib/features';
import { useFlag } from '@/lib/use-flags';
import { useAppSession } from './AppSession';
import { InstallPrompt } from './InstallPrompt';
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

  return (
    <div className="cr-app">
      {children}
      {hideNav ? null : <InstallPrompt />}
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
