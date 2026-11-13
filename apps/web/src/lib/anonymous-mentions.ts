import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToUsers } from '@/lib/push';

const MENTION = /(?<![A-Za-z0-9_@])@([A-Za-z0-9_]{3,24})\b/g;
const MAX_MENTIONS = 3;

/** The Anonymous IDs written as @name in some text (at most three, no repeats). */
export function mentionedHandles(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    found.add(match[1].toLowerCase());
    if (found.size >= MAX_MENTIONS) break;
  }
  return [...found];
}

/**
 * Tells the owner of each mentioned Anonymous ID that someone mentioned them, with a link to the post. It never says who wrote it.
 * Only IDs that exist are notified, you cannot notify yourself, and it runs after the response so it can never slow or break posting.
 */
export function notifyAnonymousMentions(options: { text: string; authorId: string; postId: string; what: 'post' | 'comment' }): void {
  const handles = mentionedHandles(options.text);
  if (handles.length === 0) return;
  after(async () => {
    try {
      const owners = await prisma.$queryRaw<Array<{ user_id: string }>>`
        select user_id::text as user_id from public.anonymous_identities where lower(handle) = any(${handles}::text[]) and user_id <> ${options.authorId}::uuid`;
      if (owners.length === 0) return;
      const title = 'Someone mentioned your Anonymous ID';
      const preview = options.text.replace(/\s+/g, ' ').slice(0, 140);
      const link = `/anonymous/posts/${options.postId}`;
      for (const owner of owners) {
        await prisma.$executeRaw`insert into public.notifications (user_id, kind, title, link, preview) values (${owner.user_id}::uuid, 'system', ${title}, ${link}, ${preview})`.catch(() => undefined);
      }
      await sendPushToUsers(owners.map((owner) => owner.user_id), { title, body: `In a ${options.what}. Tap to see it.`, url: link });
    } catch {
      // Mentions are a bonus: a failure here must never affect the post.
    }
  });
}
