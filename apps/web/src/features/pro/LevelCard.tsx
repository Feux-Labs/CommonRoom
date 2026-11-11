'use client';

import Link from 'next/link';
import { ROMAN } from './api';
import { useMyLevel } from './useMyLevel';
import { VerifiedTick } from './VerifiedTick';
import './pro.css';

/** Your rank (private to you), progress to the next step, and Pro. Hidden if it cannot load. */
export function LevelCard() {
  const level = useMyLevel();

  if (!level) return null;
  const span = level.nextStepAt === null ? 1 : level.nextStepAt - level.stepFloor;
  const done = level.nextStepAt === null ? 1 : Math.min(1, Math.max(0, (level.points - level.stepFloor) / span));

  return (
    <section aria-label="Your rank" className="cr-level">
      <div className="cr-level__top">
        <div>
          <p className="cr-level__name">{level.rank} {ROMAN[level.step - 1]}{level.pro ? <VerifiedTick /> : null}</p>
          <p className="cr-level__sub">{level.phase} · {level.points.toLocaleString()} points{level.nextStepAt === null ? ' · the summit' : ` · ${(level.nextStepAt - level.points).toLocaleString()} to the next step`}</p>
        </div>
        <Link className="cr-level__go" href="/levels">All ranks</Link>
      </div>
      <div aria-hidden="true" className="cr-level__track"><i style={{ width: `${Math.round(done * 100)}%` }} /></div>
      <p className="cr-level__hint">Points come from posting, commenting, and the likes and comments you get. Only you can see your rank. {level.pro ? 'Pro is on: your points count double until Doctore.' : <Link href="/pro">Go Pro to earn double points until Doctore.</Link>}</p>
    </section>
  );
}
