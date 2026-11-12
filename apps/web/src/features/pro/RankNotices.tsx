'use client';

import { useEffect, useState } from 'react';
import { useAppSession } from '@/features/app/AppSession';
import { BreakingBody, Ghaul } from './Ghaul';
import { fetchMyLevel, type MyLevel } from './api';
import { Star } from './RankStars';
import './pro.css';

type Notice =
  | { kind: 'rank'; rank: string; phase: string }
  | { kind: 'star'; step: number }
  | { kind: 'streak'; days: number; lost: number; rank: string; phase: string };

type Saved = { rank: number; step: number; day: string; streak: number };

const CHECK_EVERY_MS = 10 * 60 * 1000;
let lastCheckAt = 0;

const lagosDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

export function withArticle(rank: string): string {
  if (rank === 'Awakening') return 'Awakening';
  if (rank === 'Universe') return 'the Universe';
  return /^[AEIOU]/i.test(rank) ? `an ${rank}` : `a ${rank}`;
}

/** Words for someone who has been away: friendly first, then more dramatic at the top ranks. */
export function streakMessage(days: number, lost: number, rank: string, phase: string): { title: string; text: string; dramatic: boolean } {
  if (days < 7) return { title: 'We missed you', text: `Your ${lost}-day streak slipped after ${days} days away. Your Ghaul is waiting for you. Come back every day and it will grow again.`, dramatic: false };
  if (phase === 'Awakening' || phase === 'The Divine') {
    return { title: `${days} days of silence`, text: `Your ${lost}-day streak is gone. If the ways of the ${rank} be broken, shall the ${rank} body remain?`, dramatic: true };
  }
  if (phase === 'Legendary') return { title: 'Legends show up', text: `${lost} days of streak dissolved while you were away. Legends are built daily. Rise again.`, dramatic: false };
  if (phase === 'Nepo Baby') return { title: 'Even a Nepo Baby must show up', text: `Your ${lost}-day streak is gone after ${days} days away. Nobody coasts forever. Start again today.`, dramatic: false };
  return { title: 'Lapo Baby, where did you go?', text: `Your ${lost}-day streak is gone after ${days} days away. Show up today and start a new one.`, dramatic: false };
}

/** Celebrations (a new star, a new rank) and the friendly streak notices, shown on top of any screen. Checks at most every 10 minutes. */
export function RankNotices() {
  const { session } = useAppSession();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [streak, setStreak] = useState(0);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!session || !userId || Date.now() - lastCheckAt < CHECK_EVERY_MS) return;
    lastCheckAt = Date.now();
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const level: MyLevel = await fetchMyLevel(session);
        if (!active) return;
        const key = `commonroom:rank:${userId}`;
        let saved: Saved | null = null;
        try { saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as Saved | null; } catch { saved = null; }
        const today = lagosDay();
        const next: Saved = { rank: level.rankNumber, step: level.step, day: today, streak: level.streak };
        let found: Notice | null = null;
        if (saved) {
          const away = dayNumber(today) - dayNumber(saved.day);
          if (level.rankNumber > saved.rank) found = { kind: 'rank', rank: level.rank, phase: level.phase };
          else if (level.rankNumber === saved.rank && level.step > saved.step) found = { kind: 'star', step: level.step - 1 };
          else if (away >= 3 && saved.streak >= 3) found = { kind: 'streak', days: away, lost: saved.streak, rank: level.rank, phase: level.phase };
        }
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
        setStreak(level.streak);
        if (found) setNotice(found);
      } catch {
        lastCheckAt = 0;
      }
    })();
    return () => { active = false; };
    // Check when the visitor changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!notice) return null;
  const close = () => setNotice(null);

  if (notice.kind === 'star') {
    return (
      <div className="cr-rn-toast" role="status">
        <Star filled size={20} /> New star! {notice.step} of 5 for this rank.
        <button aria-label="Dismiss" onClick={close} type="button">×</button>
      </div>
    );
  }

  if (notice.kind === 'rank') {
    return (
      <div aria-label="Rank celebration" aria-modal="true" className="cr-rn-backdrop" role="dialog">
        <div className="cr-rn-card">
          <div aria-hidden="true" className="cr-confetti">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 8) * 0.15}s` }} />)}</div>
          <Star className="cr-rn-star" filled size={72} />
          <h2>{notice.rank === 'Awakening' ? 'You are now Awakening!' : `You are now ${withArticle(notice.rank)}!`}</h2>
          <p>All five stars are full. Welcome to {notice.phase}.</p>
          <button className="cr-pbtn cr-pbtn--l" onClick={close} type="button">Keep going</button>
        </div>
      </div>
    );
  }

  const message = streakMessage(notice.days, notice.lost, notice.rank, notice.phase);
  return (
    <div aria-label="Streak notice" aria-modal="true" className="cr-rn-backdrop" role="dialog">
      <div className="cr-rn-card cr-rn-card--dark">
        {message.dramatic ? <BreakingBody /> : <Ghaul days={0} size={72} />}
        <h2>{message.title}</h2>
        <p>{message.text}</p>
        <button className="cr-pbtn cr-pbtn--l" onClick={close} type="button">{streak > 0 ? 'Start again today' : 'I am back'}</button>
      </div>
    </div>
  );
}
