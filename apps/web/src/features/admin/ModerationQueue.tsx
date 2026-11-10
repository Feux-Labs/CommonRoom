'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/cr/Toast';
import { ApiError, apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';

type QueueItem = {
  reportId: string;
  source: 'anonymous' | 'room' | 'marketplace' | 'auto';
  targetKind: string;
  reason: string;
  reportedAt: string;
  preview: string;
  authorId: string | null;
  reportCount: number;
  authorStrikes: number;
};

const LABEL: Record<string, string> = {
  post: 'Anonymous post',
  comment: 'Anonymous comment',
  message: 'Anonymous message',
  room_post: 'Room post',
  listing: 'Marketplace listing',
};

/** Moderator queue: every open report in one list. Admin only. */
export function ModerationQueue() {
  const toast = useToast();
  const { account, ready } = useAppSession();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    void (async () => {
      try {
        const queue = await apiRequest<QueueItem[]>('/api/v1/admin/moderation', { session: account });
        if (!active) return;
        setItems(queue);
        setError('');
      } catch (failure) {
        if (!active) return;
        setError(failure instanceof ApiError && failure.status === 403 ? 'This page is for moderators only.' : errorMessage(failure, 'The queue could not be loaded.'));
      }
    })();
    return () => { active = false; };
  }, [account, ready, attempt]);

  const act = async (item: QueueItem, action: 'dismiss' | 'remove' | 'remove_strike') => {
    if (!account) return;
    setBusy(item.reportId);
    try {
      await apiRequest('/api/v1/admin/moderation', { session: account, method: 'POST', body: { source: item.source, reportId: item.reportId, action } });
      toast.show(action === 'dismiss' ? 'Report dismissed' : action === 'remove' ? 'Removed' : 'Removed and strike given');
      setAttempt((value) => value + 1);
    } catch (failure) {
      toast.show(errorMessage(failure, 'That did not work.'), 'error');
      setAttempt((value) => value + 1);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="cr-screen cr-mod">
      <header className="cr-hd"><h1 className="cr-hd__t">Reports</h1><span className="cr-hd__spacer" /></header>
      {!ready ? <p className="cr-mod__note">Loading…</p> : !account ? <p className="cr-mod__note">Sign in with the moderator account.</p> : error ? (
        <p className="cr-mod__note" role="alert">{error}</p>
      ) : items === null ? <p className="cr-mod__note">Loading…</p> : items.length === 0 ? (
        <p className="cr-mod__note">No open reports. Nice.</p>
      ) : items.map((item) => (
        <section className="cr-mod__card" key={item.reportId}>
          <p className="cr-mod__meta">
            <b>{LABEL[item.targetKind] ?? item.targetKind}</b> · {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'} · reason: {item.reason}
            {item.authorStrikes > 0 ? ` · author has ${item.authorStrikes} earlier ${item.authorStrikes === 1 ? 'strike' : 'strikes'}` : ''}
          </p>
          <p className="cr-mod__text">{item.preview}</p>
          <div className="cr-mod__acts">
            <button className="cr-ghost" disabled={busy === item.reportId} onClick={() => void act(item, 'dismiss')} type="button">Dismiss</button>
            <button className="cr-ghost" disabled={busy === item.reportId} onClick={() => void act(item, 'remove')} type="button">Remove</button>
            <button className="cr-pbtn cr-pbtn--danger" disabled={busy === item.reportId || !item.authorId} onClick={() => void act(item, 'remove_strike')} type="button">Remove + strike</button>
          </div>
        </section>
      ))}
    </main>
  );
}
