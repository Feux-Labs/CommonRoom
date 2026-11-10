'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, type BottomNavItemLabel } from '@/components/cr/primitives';
import { useAppSession } from './AppSession';

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

  return (
    <div className="cr-app">
      {children}
      {hideNav ? null : (
        <BottomNav
          active={active}
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
