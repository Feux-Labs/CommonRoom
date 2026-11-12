import { SMALL_STARS, type MyLevel } from './api';

const STAR_PATH = 'M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.7L12 17.6 6.1 20.8l1.3-6.7L2.5 9.5l6.6-.8z';

export function Star({ filled, size = 16, className = '' }: { filled: boolean; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" className={`cr-star ${filled ? 'cr-star--on' : ''} ${className}`} height={size} viewBox="0 0 24 24" width={size}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/** One big star for the rank and five small stars that fill as you climb; when all five are full the big star fills and you move up. */
export function RankStars({ level }: { level: Pick<MyLevel, 'step' | 'nextStepAt'> }) {
  const summit = level.nextStepAt === null;
  const filled = summit ? SMALL_STARS : level.step - 1;
  return (
    <div aria-label={`${filled} of ${SMALL_STARS} small stars`} className="cr-stars" role="img">
      <Star className="cr-stars__big" filled={summit} size={34} />
      <span className="cr-stars__small">
        {Array.from({ length: SMALL_STARS }, (_, index) => <Star filled={index < filled} key={index} size={16} />)}
      </span>
    </div>
  );
}
