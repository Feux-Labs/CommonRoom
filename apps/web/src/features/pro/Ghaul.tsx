/** The Ghaul: the pet of a chat streak. It starts as an egg and grows as the streak grows; miss a day and the streak (and the pet) start over. */
export type GhaulStage = { key: 'sleeping' | 'egg' | 'baby' | 'young' | 'fighter' | 'unbeatable'; name: string; line: string };

export function ghaulStage(days: number): GhaulStage {
  if (days >= 60) return { key: 'unbeatable', name: 'Unbeatable Ghaul', line: 'Nothing can stop it.' };
  if (days >= 30) return { key: 'fighter', name: 'Fighter Ghaul', line: 'It fights for you now.' };
  if (days >= 14) return { key: 'young', name: 'Young Ghaul', line: 'Growing fast.' };
  if (days >= 7) return { key: 'baby', name: 'Baby Ghaul', line: 'It hatched.' };
  if (days >= 1) return { key: 'egg', name: 'Ghaul egg', line: 'It hatches at 7 days.' };
  return { key: 'sleeping', name: 'Sleeping egg', line: 'Chat today to wake it.' };
}

export function Ghaul({ days, size = 56 }: { days: number; size?: number }) {
  const { key, name } = ghaulStage(days);
  return (
    <svg aria-label={name} className={`cr-ghaul cr-ghaul--${key}`} height={size} role="img" viewBox="0 0 64 64" width={size}>
      {key === 'sleeping' || key === 'egg' ? (
        <>
          <ellipse cx="32" cy="36" fill={key === 'sleeping' ? '#6b6b6b' : '#f4f1e8'} rx="16" ry="20" />
          <circle cx="26" cy="30" fill={key === 'sleeping' ? '#555' : '#7bd88f'} r="3" />
          <circle cx="38" cy="40" fill={key === 'sleeping' ? '#555' : '#7bd88f'} r="3.5" />
          <circle cx="30" cy="46" fill={key === 'sleeping' ? '#555' : '#7bd88f'} r="2" />
        </>
      ) : (
        <>
          {key === 'unbeatable' ? <path d="M18 14l5 7 5-9 4 9 5-9 5 9 4-7-3 14H21z" fill="#ffd24a" /> : null}
          {key === 'fighter' || key === 'unbeatable' ? <path d="M16 30l-6-10 10 4zM48 30l6-10-10 4z" fill="#e5e5e5" /> : null}
          {key === 'young' ? <path d="M22 22l-3-9 8 5zM42 22l3-9-8 5z" fill="#e5e5e5" /> : null}
          <ellipse cx="32" cy="42" fill={key === 'baby' ? '#4ade80' : key === 'young' ? '#22c55e' : key === 'fighter' ? '#16a34a' : '#15803d'} rx={key === 'baby' ? 14 : key === 'young' ? 17 : 19} ry={key === 'baby' ? 13 : key === 'young' ? 16 : 18} />
          {key === 'baby' ? <path d="M16 50l5-6 4 6 5-6 4 6 5-6 5 6 4-6v10H16z" fill="#f4f1e8" /> : null}
          <ellipse cx="32" cy="48" fill="#bbf7d0" rx="9" ry="8" />
          <circle cx="26" cy="38" fill="#fff" r="4" /><circle cx="38" cy="38" fill="#fff" r="4" />
          <circle cx="26.5" cy="38.5" fill="#111" r="2" /><circle cx="38.5" cy="38.5" fill="#111" r="2" />
          {key === 'fighter' || key === 'unbeatable' ? <path d="M21 34l9 3M43 34l-9 3" stroke="#111" strokeLinecap="round" strokeWidth="2" /> : null}
          {key === 'fighter' || key === 'unbeatable' ? <rect fill="#dc2626" height="4" rx="2" width="30" x="17" y="29" /> : null}
        </>
      )}
    </svg>
  );
}

/** A body that cracks and falls apart. Used when someone at the top ranks has been away too long. */
export function BreakingBody() {
  return (
    <svg aria-label="A body breaking apart" className="cr-break" height="160" role="img" viewBox="0 0 100 160" width="100">
      <g className="cr-break__glow"><ellipse cx="50" cy="80" fill="#fff" opacity="0.12" rx="46" ry="76" /></g>
      <circle className="cr-break__p cr-break__p--head" cx="50" cy="22" fill="#e9e9e9" r="14" />
      <rect className="cr-break__p cr-break__p--torso" fill="#e9e9e9" height="52" rx="10" width="34" x="33" y="40" />
      <rect className="cr-break__p cr-break__p--arml" fill="#e9e9e9" height="48" rx="6" width="12" x="17" y="42" />
      <rect className="cr-break__p cr-break__p--armr" fill="#e9e9e9" height="48" rx="6" width="12" x="71" y="42" />
      <rect className="cr-break__p cr-break__p--legl" fill="#e9e9e9" height="60" rx="7" width="15" x="34" y="94" />
      <rect className="cr-break__p cr-break__p--legr" fill="#e9e9e9" height="60" rx="7" width="15" x="51" y="94" />
      <path className="cr-break__crack" d="M50 8l-6 18 8 10-9 16 10 14-6 22" fill="none" stroke="#0a0a0a" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
