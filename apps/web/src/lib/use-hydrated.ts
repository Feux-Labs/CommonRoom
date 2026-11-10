import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * False on the server and during the first client render, true afterwards. Use it so a page that reads browser-only
 * state (such as a saved sign-in) shows the same thing the server sent on its first paint, then updates.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
