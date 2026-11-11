'use client';

import { useMyLevel } from './useMyLevel';
import { VerifiedTick } from './VerifiedTick';

/** The blue tick next to your own name, when you are Pro. */
export function MyNameTick() {
  const level = useMyLevel();
  return level?.pro ? <VerifiedTick /> : null;
}
