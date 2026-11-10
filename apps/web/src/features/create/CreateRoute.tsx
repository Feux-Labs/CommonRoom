'use client';

import { useEffect } from 'react';
import { BootScreen } from '@/features/app/AppShell';
import { useAppSession } from '@/features/app/AppSession';
import { CreatePost, type CreateDestination } from './CreatePost';

/** Guests are asked to sign in before the composer opens. */
export function CreateRoute({ destination }: { destination: CreateDestination }) {
  const { ready, isGuest, requireAccount } = useAppSession();

  useEffect(() => {
    if (ready && isGuest) requireAccount('sign-up-email');
  }, [isGuest, ready, requireAccount]);

  if (!ready || isGuest) return <BootScreen label="Opening composer" />;
  return <CreatePost destination={destination} />;
}
