'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useAppSession } from '@/features/app/AppSession';
import { errorMessage } from '@/features/app/api';
import { fetchBoost, fetchMyLevel, startBoost, type Boost, type MyLevel } from './api';
import { RankPath } from './RankFigure';
import { RankStars, Star } from './RankStars';
import './pro.css';

/** The whole ladder: five phases, twenty ranks, five small stars each. Everyone can see the summit; ranks you have not reached are locked. */
export function LevelsScreen() {
  const router = useRouter();
  const { account, session, ready, requireAccount, ensureAdult } = useAppSession();
  const [level, setLevel] = useState<MyLevel | null>(null);
  const [failed, setFailed] = useState(false);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostError, setBoostError] = useState('');

  useEffect(() => {
    if (!session) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await fetchMyLevel(session);
        if (active) setLevel(result);
        if (account) {
          const quote = await fetchBoost(account).catch(() => null);
          if (active) setBoost(quote);
        }
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
    // Reload only when the person changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, account?.user.id]);

  const phases = useMemo(() => {
    const groups: Array<{ phase: string; ranks: MyLevel['ladder'] }> = [];
    for (const rank of level?.ladder ?? []) {
      const last = groups.at(-1);
      if (last && last.phase === rank.phase) last.ranks.push(rank);
      else groups.push({ phase: rank.phase, ranks: [rank] });
    }
    return groups;
  }, [level]);

  const climb = async () => {
    if (!account || boostBusy) return;
    if (!ensureAdult(() => void climb())) return;
    setBoostBusy(true);
    setBoostError('');
    try {
      const checkout = await startBoost(account);
      window.location.assign(checkout.authorizationUrl);
    } catch (error) {
      setBoostError(errorMessage(error, 'We could not start the payment.'));
      setBoostBusy(false);
    }
  };

  const lastRank = level?.ladder.at(-1)?.name;

  return (
    <main className="cr-screen cr-levels">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Ranks</h1><p className="cr-hd__sub">Five phases. Twenty ranks. Five stars each.</p></div>
      </header>

      {ready && !session ? <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to see your rank." icon="user" title="Ranks are for members" /> : null}
      {failed ? <StateBlock description="Check your connection and try again." icon="warn" role="alert" title="Ranks didn’t load" /> : null}

      {level ? (
        <>
          <p className="cr-levels__you">
            <span className={level.guest ? 'cr-chip cr-chip--dark cr-chip--guest' : 'cr-chip cr-chip--dark'}>{level.guest ? 'Anonymous guest' : 'Signed in'}</span>{' '}
            You are <b>{level.rank}</b> in {level.phase}.
          </p>
          <div className="cr-levels__stars"><RankStars level={level} /></div>
          <RankPath phase={level.phase} />
          <p className="cr-levels__fine">Earn points by posting, commenting and showing up every day. <Link href="/rank-rules">Read the rule book</Link></p>
          {level.guest ? <p className="cr-levels__fine">You are using Common Room as a guest. Sign in to keep your rank on any phone.</p> : null}
          {boost && !boost.atSummit ? (
            <section aria-label="Climb one star" className="cr-levels__boost">
              <h2>Climb one star</h2>
              <p>Go from <b>{boost.from.toLocaleString()}</b> to <b>{boost.to?.toLocaleString()}</b> points for <b>₦{boost.priceNaira?.toLocaleString()}</b>. 18+ only. <Link href="/rank-rules#climb">See the rules</Link></p>
              {boost.available
                ? <button className="cr-pbtn cr-pbtn--l" disabled={boostBusy} onClick={() => void climb()} type="button">{boostBusy ? 'Opening Paystack…' : `Climb for ₦${boost.priceNaira?.toLocaleString()}`}</button>
                : <p className="cr-levels__fine" role="status">You can climb again {boost.nextAvailableAt ? `after ${new Date(boost.nextAvailableAt).toLocaleString()}` : 'soon'}.</p>}
              {boostError ? <p role="alert" style={{ color: '#b3261e' }}>{boostError}</p> : null}
            </section>
          ) : null}
          {phases.map((group) => (
            <section aria-label={group.phase} className="cr-levels__phase" key={group.phase}>
              <h2>{group.phase}</h2>
              <ol>
                {group.ranks.map((rank) => {
                  const next = level.ladder[level.ladder.findIndex((item) => item.name === rank.name) + 1];
                  const passed = next ? level.points >= next.start : false;
                  const reached = level.points >= rank.start;
                  const current = rank.name === level.rank;
                  const hidden = rank.name === lastRank && !reached;
                  return (
                    <li className={current ? 'cr-levels__rank cr-levels__rank--now' : reached ? 'cr-levels__rank' : 'cr-levels__rank cr-levels__rank--locked'} key={rank.name}>
                      <span className="cr-levels__rname"><Star filled={passed || (current && level.nextStepAt === null)} size={15} /> {hidden ? <span aria-label="A secret rank" className="cr-blur">{rank.name}</span> : rank.name}</span>
                      <small>{current ? `You are here · ${level.nextStepAt === null ? 5 : level.step - 1} of 5 stars` : reached ? 'Reached' : hidden ? 'Hard to reach' : `${rank.start.toLocaleString()} points`}</small>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </>
      ) : null}
    </main>
  );
}
