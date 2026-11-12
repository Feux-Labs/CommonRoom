'use client';

import { useEffect, useState } from 'react';

const PHASES = ['Lapo Baby', 'Nepo Baby', 'Legendary', 'Awakening', 'The Divine'] as const;
export type Figure = 'female' | 'male';
const KEY = 'commonroom:figure';

/** How many pictures exist for each stage (stage-<n>-<variant>.webp). Where a stage has several, each person gets one of them, always the same one. */
const VARIANTS: Record<Figure, Record<number, number>> = {
  female: { 1: 1, 2: 5, 3: 7, 4: 1, 5: 1 },
  male: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
};

export function stageOf(phase: string): number {
  return Math.max(1, PHASES.indexOf(phase as (typeof PHASES)[number]) + 1);
}

function pick(seed: string, stage: number, count: number): number {
  let hash = stage * 7919;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return (hash % Math.max(1, count)) + 1;
}

/** The picture for a stage, stepping down to the highest earlier stage that has one. Returns null when none exists. */
export function figureSrc(figure: Figure, stage: number, seed: string): string | null {
  for (let current = stage; current >= 1; current -= 1) {
    const count = VARIANTS[figure][current] ?? 0;
    if (count > 0) return `/avatars/${figure}/stage-${current}-${pick(seed, current, count)}.webp`;
  }
  return null;
}

/** The chosen character (female or male), remembered on this device. */
export function useFigure(): [Figure, (next: Figure) => void] {
  const [figure, setFigure] = useState<Figure>('female');
  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      try {
        const saved = window.localStorage.getItem(KEY);
        if (active && (saved === 'male' || saved === 'female')) setFigure(saved);
      } catch { /* storage unavailable */ }
    })();
    return () => { active = false; };
  }, []);
  const choose = (next: Figure) => {
    setFigure(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  };
  return [figure, choose];
}

/** All five stages at once: where the climb leads. The dots show which stage you are on. */
export function RankPath({ phase }: { phase: string }) {
  const [figure] = useFigure();
  const stage = stageOf(phase);
  return (
    <figure className="cr-path">
      {/* eslint-disable-next-line @next/next/no-img-element -- transparent artwork served from /public */}
      <img alt="The five stages of the climb, from Lapo Baby to The Divine" className="cr-path__img" src={`/avatars/${figure}/lineup.webp`} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      <figcaption>
        <span aria-hidden="true" className="cr-path__dots">{PHASES.map((name, index) => <i className={index + 1 <= stage ? 'on' : ''} key={name} />)}</span>
        Stage {stage} of 5 · {PHASES[stage - 1]}. The Divine is the destination.
      </figcaption>
    </figure>
  );
}
