'use client';

import Link from 'next/link';
import { Ghaul, ghaulStage } from './Ghaul';
import { RankFigure } from './RankFigure';
import { RankStars } from './RankStars';
import { useMyLevel } from './useMyLevel';
import { VerifiedTick } from './VerifiedTick';
import './pro.css';

/** Your rank (private to you): rank, five small stars, a green loader to the next star, your streak and its Ghaul. Hidden if it cannot load. */
export function LevelCard() {
  const level = useMyLevel();

  if (!level) return null;
  const span = level.nextStepAt === null ? 1 : level.nextStepAt - level.stepFloor;
  const done = level.nextStepAt === null ? 1 : Math.min(1, Math.max(0, (level.points - level.stepFloor) / span));
  const ghaul = ghaulStage(level.streak);

  return (
    <section aria-label="Your rank" className="cr-level">
      <div className="cr-level__top">
        <div>
          <p className="cr-level__name">{level.rank}{level.pro ? <VerifiedTick /> : null}<span className={level.guest ? 'cr-chip cr-chip--guest' : 'cr-chip'}>{level.guest ? 'Anonymous guest' : 'Signed in'}</span></p>
          <p className="cr-level__sub">{level.phase} · {level.points.toLocaleString()} points{level.nextStepAt === null ? ' · the summit' : ` · ${(level.nextStepAt - level.points).toLocaleString()} to the next star`}</p>
        </div>
        <Link className="cr-level__go" href="/levels">All ranks</Link>
      </div>
      <RankFigure phase={level.phase} />
      <RankStars level={level} />
      <div aria-hidden="true" className="cr-level__track"><i style={{ width: `${Math.round(done * 100)}%` }} /></div>
      <div className="cr-level__streak">
        <Ghaul days={level.streak} size={44} />
        <p><b>{level.streak > 0 ? `${level.streak}-day streak` : 'No streak yet'}</b> · {ghaul.name}<br /><span>{ghaul.line}</span></p>
      </div>
      <p className="cr-level__hint">Only you can see your rank. <Link href="/rank-rules">How ranks work</Link></p>
    </section>
  );
}
