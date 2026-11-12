'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useAppSession } from '@/features/app/AppSession';
import { errorMessage } from '@/features/app/api';
import { fetchBoost, fetchMyLevel, ROMAN, startBoost, type Boost, type MyLevel } from './api';
import './pro.css';

/** The whole ladder: five phases, twenty ranks, three steps each. Everyone can see the summit; ranks you have not reached are locked. */
export function LevelsScreen() {
  const router = useRouter();
  const { account, ready, requireAccount, ensureAdult } = useAppSession();
  const [level, setLevel] = useState<MyLevel | null>(null);
  const [failed, setFailed] = useState(false);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostError, setBoostError] = useState('');

  useEffect(() => {
    if (!account) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await fetchMyLevel(account);
        if (active) setLevel(result);
        const quote = await fetchBoost(account).catch(() => null);
        if (active) setBoost(quote);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, [account]);

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

  return (
    <main className="cr-screen cr-levels">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Ranks</h1><p className="cr-hd__sub">Five phases. Twenty ranks. Three steps each.</p></div>
      </header>

      {ready && !account ? <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to see your rank." icon="user" title="Ranks are for members" /> : null}
      {failed ? <StateBlock description="Check your connection and try again." icon="warn" role="alert" title="Ranks didn’t load" /> : null}

      {level ? (
        <>
          <p className="cr-levels__you">You are <b>{level.rank} {ROMAN[level.step - 1]}</b> in the {level.phase} phase.</p>
          {boost && !boost.atSummit ? (
            <section aria-label="Climb one step" className="cr-levels__boost">
              <h2>Climb one step</h2>
              <p>Go from <b>{boost.from.toLocaleString()}</b> to <b>{boost.to?.toLocaleString()}</b> points right now for <b>₦{boost.priceNaira?.toLocaleString()}</b>. No surprises and nothing random: you get exactly that step. One boost every 24 hours. You must be 18 or older. Earning is still the main road, and boosted points never count toward the Hall of Fame.</p>
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
                  const reached = level.points >= rank.start;
                  const current = rank.name === level.rank;
                  return (
                    <li className={current ? 'cr-levels__rank cr-levels__rank--now' : reached ? 'cr-levels__rank' : 'cr-levels__rank cr-levels__rank--locked'} key={rank.name}>
                      <span>{reached ? rank.name : `${rank.name}`}</span>
                      <small>{current ? `You are here · step ${ROMAN[level.step - 1]}` : reached ? 'Reached' : `${rank.start.toLocaleString()} points`}</small>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="cr-levels__fine">How points work: 5 for a post (up to 5 posts a day count), 2 for a comment (up to 20 a day), likes and comments you get from other people (the first 10 on a post count in full, after that they count less), 2 for each day of your daily streak (up to 30 days), 20 for each friend who joins from your invite, and 5 for each report a moderator confirms. A strike takes 50 points away. Pro doubles points until the end of Doctore. Your rank only falls if you get a strike.</p>
        </>
      ) : null}
    </main>
  );
}
