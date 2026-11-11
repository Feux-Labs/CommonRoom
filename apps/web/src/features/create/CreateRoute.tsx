'use client';

import { useEffect } from 'react';
import { BootScreen } from '@/features/app/AppShell';
import { useAppSession } from '@/features/app/AppSession';
import { CreatePost, type CreateDestination } from './CreatePost';

/** Guests are asked to sign in before the composer opens. */
export function CreateRoute({ destination }: { destination: CreateDestination }) {
  const { ready, isGuest, session, requireAccount } = useAppSession();
  const anonymous = destination === 'anonymous';

  useEffect(() => {
    if (ready && isGuest && !anonymous) requireAccount('sign-up-email');
  }, [anonymous, isGuest, ready, requireAccount]);

  if (!ready || (anonymous ? !session : isGuest)) return <BootScreen label="Opening composer" />;
  return <CreatePost destination={destination} />;
}
