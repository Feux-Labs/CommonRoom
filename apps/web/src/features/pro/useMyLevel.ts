'use client';

import { useEffect, useState } from 'react';
import { useAppSession } from '@/features/app/AppSession';
import { fetchMyLevel, type MyLevel } from './api';

const inflight = new Map<string, Promise<MyLevel>>();

/** Your own rank, streak and Pro status (guests have a rank too), loaded once per visitor and shared by everything on screen that needs it. */
export function useMyLevel(): MyLevel | null {
  const { session: account } = useAppSession();
  const [level, setLevel] = useState<MyLevel | null>(null);
  const token = account?.access_token ?? null;

  useEffect(() => {
    if (!account || !token) return;
    let active = true;
    const key = account.user.id;
    let request = inflight.get(key);
    if (!request) {
      request = fetchMyLevel(account).finally(() => { setTimeout(() => inflight.delete(key), 2000); });
      inflight.set(key, request);
    }
    void request.then((result) => { if (active) setLevel(result); }).catch(() => { if (active) setLevel(null); });
    return () => { active = false; };
    // Reload only when the person changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.user.id]);

  return level;
}
