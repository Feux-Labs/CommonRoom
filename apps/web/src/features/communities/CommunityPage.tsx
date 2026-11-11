'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { ErrorBlock, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { useToast } from '@/components/cr/Toast';
import { errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import type { RoomPost } from '@/lib/room-contracts';
import { communityPosts, deleteCommunity, getCommunity, reportCommunity, setMembership, type Community } from './api';
import './communities.css';

/** One community: join or leave, see its posts, post to it, report it, or (for its owner) delete it. */
export function CommunityPage({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const { account, ready, requireAccount } = useAppSession();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    void (async () => {
      try {
        const [info, list] = await Promise.all([getCommunity(account, slug), communityPosts(account, slug)]);
        if (!active) return;
        setCommunity(info);
        setPosts(list);
        setStatus('ready');
      } catch (loadError) {
        if (active) setStatus(loadError instanceof Error && /not be found|404/.test(loadError.message) ? 'missing' : 'error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, ready, slug]);

  const toggleMembership = useCallback(async () => {
    if (!account || !community || busy) return;
    setBusy(true);
    try {
      const result = await setMembership(account, slug, !community.joined);
      setCommunity({ ...community, joined: result.joined, memberCount: community.memberCount + (result.joined ? 1 : -1) });
    } catch (membershipError) {
      toast.show(errorMessage(membershipError, 'That did not work. Try again.'), 'error');
    } finally {
      setBusy(false);
    }
  }, [account, busy, community, slug, toast]);

  if (ready && !account) {
    return <main className="cr-screen"><StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to see this community." icon="user" title="Communities are for members" /></main>;
  }

  return (
    <main className="cr-screen cr-communities">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/communities')} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">{community?.name ?? 'Community'}</h1>{community ? <p className="cr-hd__sub">{community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}</p> : null}</div>
      </header>

      {status === 'loading' ? <p className="cr-empty-line" role="status">Loading…</p> : null}
      {status === 'missing' ? <StateBlock description="It may have been removed." icon="warn" title="This community isn’t here" /> : null}
      {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={() => { setStatus('loading'); setAttempt((value) => value + 1); }} title="Couldn’t open this community" /> : null}

      {status === 'ready' && community ? (
        <>
          {community.description ? <p className="cr-communities__about">{community.description}</p> : null}
          <div className="cr-communities__acts">
            {community.isOwner ? null : <button className={community.joined ? 'cr-ghost cr-ghost--l' : 'cr-pbtn cr-pbtn--l'} disabled={busy} onClick={() => void toggleMembership()} type="button">{community.joined ? 'Leave' : 'Join'}</button>}
            {community.joined ? <button className="cr-pbtn cr-pbtn--l" onClick={() => router.push(`/create?c=${community.id}`)} type="button">Post here</button> : null}
          </div>

          {posts.length === 0 ? <p className="cr-empty-line">{community.joined ? 'No posts yet. Say something.' : 'No posts yet. Join to post.'}</p> : null}
          {posts.map((post) => (
            <article className="cr-communities__post" key={post.id}>
              <p className="cr-communities__who">{post.authorName} · @{post.authorUsername} · {post.time}</p>
              <p>{post.caption}</p>
              <button className="cr-link" onClick={() => router.push(`/posts/${post.id}`)} type="button">Open</button>
            </article>
          ))}

          <div className="cr-communities__foot">
            {community.isOwner
              ? <button className="cr-link cr-link--muted" onClick={() => setConfirmDelete(true)} type="button">Delete this community</button>
              : <button className="cr-link cr-link--muted" onClick={() => setReporting(true)} type="button">Report this community</button>}
          </div>
        </>
      ) : null}

      <ReportSheet
        context="Community"
        onClose={() => setReporting(false)}
        onSubmit={async (reason, details) => {
          if (!account) return;
          await reportCommunity(account, slug, details ? `${reason}: ${details}` : reason);
          setReporting(false);
          toast.show('Report sent');
        }}
        open={reporting}
        subject="community"
      />
      <BottomSheet description="The group is removed. Its posts stay in Room as ordinary posts." onClose={() => setConfirmDelete(false)} open={confirmDelete} title="Delete this community?">
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l cr-pbtn--danger" disabled={busy} onClick={() => {
            if (!account) return;
            setBusy(true);
            void deleteCommunity(account, slug).then(() => router.push('/communities')).catch((deleteError: unknown) => { toast.show(errorMessage(deleteError, 'Could not delete it.'), 'error'); setBusy(false); });
          }} type="button">Delete</button>
        </div>
      </BottomSheet>
    </main>
  );
}
