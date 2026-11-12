import { prisma } from '@/lib/prisma';
import { sendPushToUsers, type PushPayload } from '@/lib/push';

/** Same ladder as the database function my_level() (migration 0061). Only used to word a reminder; the database stays the source of truth for ranks. */
const RANKS: Array<[name: string, phase: string, start: number]> = [
  ['Novice', 'Lapo Baby', 0], ['Amateur', 'Lapo Baby', 40], ['Regular', 'Lapo Baby', 150], ['Professional', 'Lapo Baby', 700],
  ['Young Master', 'Nepo Baby', 1300], ['High Chief', 'Nepo Baby', 2100], ['Senator', 'Nepo Baby', 3600],
  ['Sensei', 'Legendary', 4300], ['Shifu', 'Legendary', 4900], ['Doctore', 'Legendary', 5400], ['Paragon', 'Legendary', 8000],
  ['Awakening', 'Awakening', 11000], ['Sage', 'Awakening', 14400], ['Great Sage', 'Awakening', 17500], ['Deity', 'Awakening', 21900],
  ['Immortal', 'The Divine', 26000], ['God', 'The Divine', 32900], ['True God', 'The Divine', 37500], ['Ancient God', 'The Divine', 41000], ['Universe', 'The Divine', 43800],
];

export function rankAt(points: number): { name: string; phase: string } {
  let found = RANKS[0];
  for (const rank of RANKS) if (points >= rank[2]) found = rank;
  return { name: found[0], phase: found[1] };
}

/** Friendly the evening after a missed day, kind after 3 days, and dramatic after 7 for the Awakening and Divine ranks. */
export function reminderMessage(away: number, run: number, points: number): PushPayload {
  const { name, phase } = rankAt(points);
  if (away === 1) return { title: 'Your streak ends tonight', body: `Your ${run}-day streak is one visit away from breaking.`, url: '/me' };
  if (away === 3) return { title: 'We missed you', body: `Your ${run}-day streak slipped after 3 days away. Come back and start again today.`, url: '/me' };
  if (phase === 'Awakening' || phase === 'The Divine') return { title: `${away} days of silence`, body: `If the ways of the ${name} be broken, shall the ${name} body remain? Your ${run}-day streak is gone.`, url: '/me' };
  return { title: 'Your streak is gone', body: `${away} days away. Your ${run}-day streak is gone. Show up today and begin again.`, url: '/me' };
}

const BATCH = 200;
const CONCURRENCY = 20;

/** Sends one batch of reminders (each person at most once per gap), 20 at a time. Returns how many people were in the batch. `send` is for tests. */
export async function sendStreakReminders(send: typeof sendPushToUsers = sendPushToUsers, limit = BATCH): Promise<number> {
  const due = await prisma.$queryRaw<Array<{ user_id: string; away: number; run: number; points: bigint | number }>>`select user_id::text as user_id, away, run, points from public.claim_streak_reminders(${limit}::int)`;
  for (let start = 0; start < due.length; start += CONCURRENCY) {
    await Promise.all(due.slice(start, start + CONCURRENCY).map(async (row) => {
      const message = reminderMessage(Number(row.away), Number(row.run), Number(row.points));
      await prisma.$executeRaw`insert into public.notifications (user_id, kind, title, link, preview) values (${row.user_id}::uuid, 'system', ${message.title}, ${message.url}, ${message.body.slice(0, 200)})`.catch(() => undefined);
      await send([row.user_id], message);
    }));
  }
  return due.length;
}

/** Keeps sending batches until nobody is left or the time budget is used up; the next call carries on where this one stopped. */
export async function sendStreakRemindersWithin(budgetMs: number, send: typeof sendPushToUsers = sendPushToUsers): Promise<number> {
  const started = Date.now();
  let total = 0;
  while (Date.now() - started < budgetMs) {
    const sent = await sendStreakReminders(send);
    total += sent;
    if (sent < BATCH) break;
  }
  return total;
}
