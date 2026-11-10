'use client';

import { useEffect } from 'react';
import { BootScreen } from '@/features/app/AppShell';
import { useAppSession } from '@/features/app/AppSession';
import { SellListing } from './SellListing';

/** Selling needs an account; guests see the sign-in flow first. */
export function SellRoute({ listingId }: { listingId?: string }) {
  const { ready, isGuest, requireAccount } = useAppSession();

  useEffect(() => {
    if (ready && isGuest) requireAccount('sign-up-email');
  }, [isGuest, ready, requireAccount]);

  if (!ready || isGuest) return <BootScreen label="Opening seller form" />;
  return <SellListing listingId={listingId} />;
}
