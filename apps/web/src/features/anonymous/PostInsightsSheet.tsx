'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { apiRequest, errorMessage } from '@/features/app/api';

type Insights = { views: number; viewers: number; likes: number; comments: number; shares: number };

/** What happened to your post: shown only to its author. Mounted once, loads when a post is chosen. */
export function PostInsightsSheet({ kind, postId, session, onClose }: { kind: 'anonymous' | 'room'; postId: string | null; session: Session | null; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<{ id: string; data?: Insights; error?: string } | null>(null);

  useEffect(() => {
    if (!postId || !session) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const data = await apiRequest<Insights>(`/api/v1/insights?kind=${kind}&id=${postId}`, { session });
        if (active) setState({ id: postId, data });
      } catch (error) {
        if (active) setState({ id: postId, error: errorMessage(error, 'Could not load the numbers.') });
      }
    })();
    return () => { active = false; };
  }, [kind, postId, session]);

  const current = state && state.id === postId ? state : null;
  const rows: Array<[string, number]> = current?.data
    ? [['Views', current.data.views], ['People who looked', current.data.viewers], ['Likes', current.data.likes], ['Comments', current.data.comments], ['Shares', current.data.shares]]
    : [];

  return (
    <BottomSheet description="Only you can see these numbers." onClose={onClose} open={Boolean(postId)} title="Your post, in numbers">
      {current?.error ? <p role="alert">{current.error}</p> : null}
      {!current ? <p aria-busy="true">Loading…</p> : null}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 16px', margin: '8px 0 4px' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt>{label}</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {postId && kind === 'anonymous' ? <button className="cr-pbtn cr-pbtn--l" onClick={() => router.push(`/anonymous/posts/${postId}/insights`)} type="button">Show details</button> : null}
    </BottomSheet>
  );
}
