'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { UserAvatar } from '@/components/cr/Avatars';
import { useAppSession } from '@/features/app/AppSession';
import { figureSrc, stageOf, useFigure } from './RankFigure';
import { Star } from './RankStars';
import { useMyLevel } from './useMyLevel';
import { VerifiedTick } from './VerifiedTick';
import './profile-hero.css';

const SPARKS = Array.from({ length: 16 }, (_, index) => ({ left: 6 + ((index * 53) % 88), delay: (index % 8) * 0.55, duration: 4 + (index % 5) * 0.8, size: 2 + (index % 3) }));

/**
 * The top of a profile: who you are, your rank, and your character standing on a living stage (breathing glow, floating figure,
 * rippling platform, drifting sparkles; richer with each phase). Rank, points, stars and progress sit underneath.
 */
export function ProfileHero({ name, avatarUrl, guest, fallback }: { name: string; avatarUrl?: string | null; guest?: boolean; fallback?: ReactNode }) {
  const { session } = useAppSession();
  const level = useMyLevel();
  const [figure, chooseFigure] = useFigure();
  if (!level) return <>{fallback ?? null}</>;

  const stage = stageOf(level.phase);
  const src = figureSrc(figure, stage, session?.user.id ?? 'guest');
  const summit = level.nextStepAt === null;
  const span = summit ? 1 : level.nextStepAt! - level.stepFloor;
  const done = summit ? 1 : Math.min(1, Math.max(0, (level.points - level.stepFloor) / span));
  const filled = summit ? 5 : level.step - 1;
  const scene = figure === 'male' && stage === 5;

  return (
    <section aria-label="Your rank" className="ph" data-stage={stage}>
      <div className="ph-row">
        <span className="ph-avatar">{guest ? <span aria-hidden="true" className="ph-avatar__guest">A</span> : <UserAvatar name={name} size="l" src={avatarUrl ?? null} />}</span>
        <div className="ph-who">
          <h1 className="ph-name">{name}{level.pro ? <VerifiedTick /> : null}<span className={guest ? 'ph-chip ph-chip--guest' : 'ph-chip'}>{guest ? 'Anonymous guest' : 'Signed in'}</span></h1>
          <p className="ph-rank">{level.rank} · {level.phase}</p>
        </div>
        <Link className="ph-all" href="/levels">All ranks <span aria-hidden="true">›</span></Link>
      </div>

      <div className="ph-stage" role="img" aria-label={`Your character, stage ${stage} of 5`}>
        <span aria-hidden="true" className="ph-rays" />
        <span aria-hidden="true" className="ph-glow" />
        <span aria-hidden="true" className="ph-sparks">{SPARKS.map((spark, index) => <i key={index} style={{ left: `${spark.left}%`, width: spark.size, height: spark.size, animationDelay: `${spark.delay}s`, animationDuration: `${spark.duration}s` }} />)}</span>
        <span aria-hidden="true" className="ph-platform"><i /><i /><i /></span>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- transparent artwork served from /public
          <img alt="" className={scene ? 'ph-figure ph-figure--scene' : 'ph-figure'} key={src} src={src} />
        ) : null}
      </div>

      <div className="ph-points">
        <p><b>{level.points.toLocaleString()}</b> points</p>
        <span aria-label="Choose your character" className="ph-pick" role="group">
          <button aria-pressed={figure === 'female'} onClick={() => chooseFigure('female')} type="button">Female</button>
          <button aria-pressed={figure === 'male'} onClick={() => chooseFigure('male')} type="button">Male</button>
        </span>
      </div>

      <div className="ph-stars">
        <span aria-label={`${filled} of 5 small stars`} className="ph-stars__row" role="img">{Array.from({ length: 5 }, (_, index) => <Star filled={index < filled} key={index} size={19} />)}</span>
        <small>{summit ? 'The summit' : `${(level.nextStepAt! - level.points).toLocaleString()} points to the next star`}</small>
      </div>
      <div aria-hidden="true" className="ph-track"><i style={{ width: `${Math.round(done * 100)}%` }} /></div>
      <p className="ph-hint">Only you can see your rank. <Link href="/rank-rules">How ranks work</Link></p>
    </section>
  );
}
