'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useAppSession } from '@/features/app/AppSession';
import { fetchMyLevel, ROMAN, type MyLevel } from './api';
import './pro.css';

/** The whole ladder: five phases, twenty ranks, three steps each. Everyone can see the summit; ranks you have not reached are locked. */
export function LevelsScreen() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [level, setLevel] = useState<MyLevel | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!account) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await fetchMyLevel(account);
        if (active) setLevel(result);
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
          <p className="cr-levels__fine">Points: 5 for every post, 2 for every comment, 1 for every like and 2 for every comment you get from other people. Pro doubles points until the end of Doctore. Your rank never goes down.</p>
        </>
      ) : null}
    </main>
  );
}
