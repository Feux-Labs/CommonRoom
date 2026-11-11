'use client';

import { useEffect, useState } from 'react';

type Flags = Record<string, boolean>;

let cached: Flags | null = null;
let inflight: Promise<Flags> | null = null;

function load(): Promise<Flags> {
  inflight ??= fetch('/api/v1/flags', { headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { data?: { flags?: Flags } } | null) => {
      cached = body?.data?.flags ?? {};
      return cached;
    })
    .catch(() => {
      cached = {};
      return cached;
    });
  return inflight;
}

/** On/off switches set in the admin console. Anything unknown, or a failed load, counts as ON, so a hiccup never hides a feature. */
export function useFlag(key: string): boolean {
  const [flags, setFlags] = useState<Flags | null>(cached);
  useEffect(() => {
    if (cached) return;
    let active = true;
    void load().then((loaded) => { if (active) setFlags(loaded); });
    return () => { active = false; };
  }, []);
  return flags?.[key] ?? true;
}
