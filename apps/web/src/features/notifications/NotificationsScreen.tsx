'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { apiRequest } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { shortAge } from '@/lib/format';

export type NotificationItem = {
  id: string;
  kind: 'like' | 'comment' | 'reply' | 'follow' | 'anon_comment' | 'anon_reply' | 'inbox_message'
    | 'market_message' | 'room_join' | 'room_post' | 'rank_up' | 'reveal_request' | 'reveal_response' | 'ad_status' | 'restriction' | 'system';
  actorId: string | null;
  actorName: string | null;
  postId: string | null;
  anonPostId: string | null;
  threadId: string | null;
  preview: string | null;
  /** Text and link supplied by newer features (market messages, ranks, ads...). */
  title: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationsPayload = { unread: number; items: NotificationItem[] };

/** What a notification says and where tapping it goes. Anonymous kinds never name anyone. */
export function describeNotification(item: NotificationItem): { text: string; href: string } {
  const who = item.actorName?.trim() || 'Someone';
  const quote = item.preview ? `: “${item.preview}”` : '';
  switch (item.kind) {
    case 'like': return { text: `${who} liked your post`, href: item.postId ? `/posts/${item.postId}` : '/room' };
    case 'comment': return { text: `${who} commented on your post${quote}`, href: item.postId ? `/posts/${item.postId}` : '/room' };
    case 'reply': return { text: `${who} replied to your comment${quote}`, href: item.postId ? `/posts/${item.postId}` : '/room' };
    case 'follow': return { text: `${who} started following you`, href: item.actorId ? `/u/${item.actorId}` : '/me' };
    case 'anon_comment': return { text: `Someone commented on your anonymous post${quote}`, href: item.anonPostId ? `/anonymous/posts/${item.anonPostId}` : '/anonymous' };
    case 'anon_reply': return { text: `Someone replied to your anonymous comment${quote}`, href: item.anonPostId ? `/anonymous/posts/${item.anonPostId}` : '/anonymous' };
    case 'inbox_message': return { text: `New anonymous message${quote}`, href: item.threadId ? `/anonymous/inbox/thread/${item.threadId}` : '/anonymous/inbox' };
    default: return { text: item.title?.trim() || 'New notification', href: item.link ?? '/notifications' };
  }
}

/** Loads your newest notifications and marks them seen. Failing to mark them seen (for example while paused) is harmless. */
function useNotifications(limit: number, onSeen?: () => void) {
  const { account, ready, requireAccount } = useAppSession();
  const [data, setData] = useState<NotificationsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    void (async () => {
      try {
        const payload = await apiRequest<NotificationsPayload>(`/api/v1/notifications?limit=${limit}`, { session: account });
        if (!active) return;
        setData(payload);
        setFailed(false);
        if (payload.unread > 0) {
          void apiRequest('/api/v1/notifications', { session: account, method: 'POST', body: { action: 'read_all' } })
            .then(() => onSeen?.())
            .catch(() => undefined);
        }
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
    // onSeen is a stable callback owned by the caller; re-running on it would refetch needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ready, attempt, limit]);

  return { ready, account, data, failed, requireAccount, retry: () => setAttempt((value) => value + 1) };
}

function Rows({ items, onNavigate }: { items: NotificationItem[]; onNavigate?: () => void }) {
  return (
    <ul className="cr-notif">
      {items.map((item) => {
        const { text, href } = describeNotification(item);
        return (
          <li key={item.id}>
            <Link className={item.read ? 'cr-notif__row' : 'cr-notif__row is-unread'} href={href} onClick={onNavigate}>
              <span className="cr-notif__text">{text}</span>
              <span className="cr-notif__age">{shortAge(item.createdAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const { ready, account, data, failed, requireAccount, retry } = useNotifications(50);

  return (
    <main className="cr-screen">
      <header className="cr-hd">
        <h1 className="cr-hd__big">Notifications</h1>
        <button aria-label="Close" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="x" /></button>
      </header>
      {!ready ? null : !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to see likes, comments and messages." icon="bell" title="Notifications" />
      ) : failed ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={retry} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="Notifications didn’t load" />
      ) : data === null ? (
        <p className="cr-notif__loading">Loading…</p>
      ) : data.items.length === 0 ? (
        <StateBlock description="Likes, comments, new followers and anonymous messages will show up here." icon="bell" title="Nothing yet" />
      ) : (
        <Rows items={data.items} />
      )}
    </main>
  );
}

/** The drop-down that opens from the bell: your latest notifications without leaving the page. */
export function NotificationsPanel({ onClose, onSeen }: { onClose: () => void; onSeen?: () => void }) {
  const { ready, account, data, failed, retry } = useNotifications(15, onSeen);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cr-notifpanel__layer">
      <button aria-label="Close notifications" className="cr-notifpanel__backdrop" onClick={onClose} type="button" />
      <section aria-label="Notifications" className="cr-notifpanel" role="dialog">
        <header className="cr-notifpanel__hd">
          <b>Notifications</b>
          <Link className="cr-notifpanel__all" href="/notifications" onClick={onClose}>See all</Link>
        </header>
        {!ready || (account && data === null && !failed) ? <p className="cr-notif__loading">Loading…</p>
          : failed ? <p className="cr-notif__loading" role="alert">Couldn’t load. <button className="cr-notifpanel__retry" onClick={retry} type="button">Try again</button></p>
          : !data || data.items.length === 0 ? <p className="cr-notif__loading">Nothing yet. Likes, comments, followers and messages will show up here.</p>
          : <Rows items={data.items} onNavigate={onClose} />}
      </section>
    </div>
  );
}
