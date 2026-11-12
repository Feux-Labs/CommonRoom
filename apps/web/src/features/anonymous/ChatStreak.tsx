'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Ghaul, ghaulStage } from '@/features/pro/Ghaul';
import { anonRequest } from './api';

export type ChatStreakInfo = { threadId: string; streak: number; todayDone: boolean; youSentToday: boolean };

/** A streak shows from 3 days, like TikTok. */
export const STREAK_FROM = 3;

/** Your chat streaks by conversation, loaded once. Missing conversation = no streak. */
export function useChatStreaks(session: Session | null): Map<string, ChatStreakInfo> {
  const [streaks, setStreaks] = useState<Map<string, ChatStreakInfo>>(new Map());
  useEffect(() => {
    if (!session) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      try {
        const rows = await anonRequest<ChatStreakInfo[]>(session, '/inbox/streaks');
        if (active) setStreaks(new Map(rows.map((row) => [row.threadId, row])));
      } catch { /* streaks are a bonus: no streak shown if they cannot load */ }
    })();
    return () => { active = false; };
    // Reload when the person changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);
  return streaks;
}

/** After 6 pm (Nigeria time) a streak that has not been kept up today shows an hourglass, like TikTok. */
function expiring(info: ChatStreakInfo): boolean {
  if (info.todayDone) return false;
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', hour12: false }));
  return hour >= 18;
}

/** The small streak badge next to a conversation: the pet and the number of days. */
export function ChatStreakBadge({ info }: { info: ChatStreakInfo | undefined }) {
  if (!info || info.streak < STREAK_FROM) return null;
  return (
    <span aria-label={`${info.streak}-day streak, ${ghaulStage(info.streak).name}${expiring(info) ? ', about to end' : ''}`} className="cr-cstreak" role="img">
      <Ghaul days={info.streak} size={20} />
      <b>{info.streak}</b>
      {expiring(info) ? <span aria-hidden="true">⏳</span> : null}
    </span>
  );
}

/** The line in the conversation header: what the pet is and what keeps it alive. */
export function ChatStreakLine({ info }: { info: ChatStreakInfo | undefined }) {
  if (!info || info.streak < STREAK_FROM) return null;
  const stage = ghaulStage(info.streak);
  return (
    <p className="cr-cstreak__line">
      <Ghaul days={info.streak} size={26} />
      <span><b>{info.streak}-day streak</b> · {stage.name}<br />{info.todayDone ? 'You both sent a message today.' : info.youSentToday ? 'You sent yours today. Waiting for them.' : 'Send a message today to keep it alive.'}</span>
    </p>
  );
}
