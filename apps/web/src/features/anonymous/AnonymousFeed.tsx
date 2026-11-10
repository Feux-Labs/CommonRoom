'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnonAvatar } from '@/components/cr/Avatars';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { CommentsSheet, type SheetComment } from '@/components/cr/CommentsSheet';
import { ErrorBlock, FeedSkeleton, ListFooter, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { SensitiveGate } from '@/components/cr/SensitiveGate';
import { FeedVideo } from '@/components/cr/FeedVideo';
import { ShareSheet } from '@/components/cr/ShareSheet';
import { isCardTheme } from '@/features/share/card';
import { useToast } from '@/components/cr/Toast';
import { useAppSession } from '@/features/app/AppSession';
import { compactCount, shortAge } from '@/lib/format';
import {
  anonMediaUrl,
  anonRequest,
  mergeUnique,
  pinFirst,
  topicOf,
  type AnonComment,
  type AnonIdentity,
  type AnonPost,
  type AnonPostPage,
  type ReportTargetKind,
} from './api';
import { AnonymousNameSheet } from './AnonymousNameSheet';

/** Anonymous feed screen and mockups 15, 18, 19, 71, 72, 73. `focusPostId` shows one shared post. */
export function AnonymousFeed({ focusPostId = null, pinPostId = null }: { focusPostId?: string | null; pinPostId?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { session, account, isGuest, requireAccount, ready } = useAppSession();
  const [posts, setPosts] = useState<AnonPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [identity, setIdentity] = useState<AnonIdentity | null | undefined>(undefined);
  const [nameSheet, setNameSheet] = useState<null | (() => void)>(null);
  const [commentsFor, setCommentsFor] = useState<AnonPost | null>(null);
  const [comments, setComments] = useState<AnonComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reportTarget, setReportTarget] = useState<{ kind: ReportTargetKind; id: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<AnonPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnonPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const generation = useRef(0);
  const loadingMoreRef = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || loadingMoreRef.current) return;
    const current = generation.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await anonRequest<AnonPostPage>(session, `/posts?scope=all_nigerian_schools&page=1&sort=hot&cursor=${encodeURIComponent(cursor)}`);
      if (current !== generation.current) return;
      setPosts((existing) => mergeUnique(existing, page.posts));
      setHasMore(page.hasMore && page.nextCursor !== null);
      setCursor(page.nextCursor);
    } catch {
      if (current === generation.current) setMoreFailed(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor, hasMore, session]);

  // Retry button: show the skeleton again and run the load effect once more.
  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setMoreFailed(false);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    const current = ++generation.current;
    void (async () => {
      try {
        if (focusPostId) {
          const result = await anonRequest<AnonPost[]>(session, `/posts?scope=all_nigerian_schools&id=${encodeURIComponent(focusPostId)}`);
          if (current !== generation.current) return;
          setPosts(result);
          setHasMore(false);
          setCursor(null);
        } else {
          const page = await anonRequest<AnonPostPage>(session, '/posts?scope=all_nigerian_schools&page=1&sort=hot');
          if (current !== generation.current) return;
          setPosts(mergeUnique([], pinFirst(page.posts, pinPostId)));
          setHasMore(page.hasMore && page.nextCursor !== null);
          setCursor(page.nextCursor);
        }
        setStatus('ready');
      } catch {
        if (current === generation.current) setStatus('error');
      }
    })();
  }, [attempt, focusPostId, pinPostId, ready, session]);

  // Coming back from the composer (?posted=...): the new post is pinned first; tidy the address bar.
  useEffect(() => {
    if (pinPostId) window.history.replaceState(null, '', '/anonymous');
  }, [pinPostId]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || moreFailed || status !== 'ready') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: '400px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, moreFailed, status]);

  useEffect(() => {
    if (!account) return;
    let active = true;
    anonRequest<AnonIdentity | null>(account, '/identity')
      .then((result) => { if (active) setIdentity(result); })
      .catch(() => { if (active) setIdentity(null); });
    return () => { active = false; };
  }, [account]);

  /** Runs `action` once the user has an account and an anonymous identity. */
  const withIdentity = (action: () => void) => {
    if (!requireAccount('sign-in')) return;
    if (identity) {
      action();
      return;
    }
    setNameSheet(() => action);
  };

  const ranked = posts;

  const toggleLike = (post: AnonPost) => withIdentity(() => {
    const optimistic = !post.liked_by_me;
    setPosts((list) => list.map((item) => (item.id === post.id ? { ...item, liked_by_me: optimistic, likes_count: Math.max(0, item.likes_count + (optimistic ? 1 : -1)) } : item)));
    anonRequest<{ liked: boolean; likes_count: number }>(account, `/posts/${post.id}/like`, 'POST')
      .then((result) => setPosts((list) => list.map((item) => (item.id === post.id ? { ...item, liked_by_me: result.liked, likes_count: result.likes_count } : item))))
      .catch((error: unknown) => {
        setPosts((list) => list.map((item) => (item.id === post.id ? { ...item, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : item)));
        toast.show(error instanceof Error ? error.message : 'Your reaction could not be saved.', 'error');
      });
  });

  const loadComments = useCallback(async (post: AnonPost) => {
    setCommentsStatus('loading');
    try {
      const result = await anonRequest<AnonComment[]>(session, `/posts/${post.id}/comments`);
      setComments(result);
      setCommentsStatus('ready');
    } catch {
      setCommentsStatus('error');
    }
  }, [session]);

  const openComments = (post: AnonPost) => {
    setCommentsFor(post);
    setComments([]);
    void loadComments(post);
  };

  const submitComment = async (body: string, parent: SheetComment | null) => {
    if (!commentsFor) return;
    if (!account) {
      requireAccount('sign-in');
      return;
    }
    if (!identity) {
      setNameSheet(() => () => undefined);
      throw new Error('Set up Anonymous first, then send your comment again.');
    }
    const created = await anonRequest<AnonComment>(account, `/posts/${commentsFor.id}/comments`, 'POST', { body, parentCommentId: parent?.id ?? null });
    setComments((list) => [...list, created]);
    setPosts((list) => list.map((item) => (item.id === commentsFor.id ? { ...item, comments_count: item.comments_count + 1 } : item)));
    setCommentsFor((current) => (current ? { ...current, comments_count: current.comments_count + 1 } : current));
  };

  const submitReport = async (reason: string, details: string) => {
    if (!reportTarget || !account) return;
    await anonRequest(account, '/reports', 'POST', {
      targetKind: reportTarget.kind,
      targetId: reportTarget.id,
      reason: details ? `${reason}: ${details}` : reason,
    });
    setReportTarget(null);
    toast.show('Report sent');
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !account) return;
    setDeleting(true);
    try {
      await anonRequest(account, `/posts/${deleteTarget.id}`, 'DELETE');
      setPosts((list) => list.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.show('Post deleted');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Your post could not be deleted.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    if (requireAccount('sign-up-email')) router.push('/create?to=anonymous');
  };

  const sheetComments: SheetComment[] = comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parent_comment_id,
    author: 'Anonymous',
    avatar: <AnonAvatar size="s" />,
    body: comment.body,
    createdAt: comment.created_at,
  }));

  return (
    <main className="cr-screen cr-screen--flush cr-anon">
      <header className="cr-hd cr-pad">
        {focusPostId ? (
          <button aria-label="Back to Anonymous" className="cr-icon-btn" onClick={() => router.push('/anonymous')} type="button"><Icon name="back" /></button>
        ) : (
          <div>
            <h1 className="cr-hd__big">Anonymous</h1>
            <p className="cr-hd__sub">Never linked to your profile.</p>
          </div>
        )}
        <button aria-label="Inbox" className="cr-icon-btn" onClick={() => { if (requireAccount('sign-in')) router.push('/anonymous/inbox'); }} type="button">
          <Icon name="inbox" />
        </button>
      </header>

      <div className="cr-pad">
        {status === 'loading' ? <FeedSkeleton count={3} label="Loading Anonymous posts" media={false} /> : null}
        {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t load posts" /> : null}
        {status === 'ready' && ranked.length === 0 ? (
          focusPostId
            ? <StateBlock description="It may have been deleted." icon="anon" title="This post isn’t available" />
            : <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={openCreate} type="button">Post anonymously</button>} description="Be the first to post. Nobody will know it’s you." icon="anon" title="No posts yet" />
        ) : null}

        {status === 'ready' ? ranked.map((post) => {
          const topic = topicOf(post);
          const photos = (post.media_items ?? []).filter((item) => item.mediaType === 'photo');
          const videos = (post.media_items ?? []).filter((item) => item.mediaType === 'video');
          const sensitiveMedia = (post.media_items ?? []).some((item) => item.sensitive);
          return (
            <article className="cr-apost" key={post.id}>
              <AnonAvatar />
              <div className="cr-apost__main">
                <p className="cr-apost__meta">Anonymous · {shortAge(post.created_at)}{topic ? ` · ${topic}` : ''}</p>
                {post.body && !(post.media_items ?? []).length ? (
                  <div className={`cr-tcard cr-tcard--${post.card_theme ?? 'blue-hour'} cr-tcard--${post.body.length > 160 ? 'sm' : post.body.length > 80 ? 'md' : 'lg'}`}>{post.body}</div>
                ) : null}
                {post.body && (post.media_items ?? []).length ? <p className="cr-apost__body">{post.body}</p> : null}
                <SensitiveGate active={sensitiveMedia}>
                {photos.length ? (
                  <div className={photos.length > 1 ? 'cr-apost__media cr-apost__media--grid' : 'cr-apost__media'}>
                    {photos.map((item) => (
                      <button aria-label="Open photo" className="cr-apost__photo" key={item.path} onClick={() => setLightbox(anonMediaUrl(item.path))} type="button">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage media */}
                        <img alt="" loading="lazy" src={anonMediaUrl(item.path)} />
                      </button>
                    ))}
                  </div>
                ) : null}
                {videos.map((item) => (
                  <FeedVideo className="cr-apost__video" key={item.path} src={anonMediaUrl(item.path)} />
                ))}
                </SensitiveGate>
                <div className="cr-actions">
                  <button aria-label={post.liked_by_me ? 'Unlike' : 'Like'} aria-pressed={post.liked_by_me} className="cr-act" onClick={() => toggleLike(post)} type="button"><Icon name="heart" />{compactCount(post.likes_count)}</button>
                  <button aria-label={`Comments, ${post.comments_count}`} className="cr-act" onClick={() => openComments(post)} type="button"><Icon name="cmt" />{compactCount(post.comments_count)}</button>
                  <button aria-label="Share" className="cr-act" onClick={() => setShareTarget(post)} type="button"><Icon name="up" /></button>
                  {post.is_mine ? (
                    <button aria-label="Delete your post" className="cr-act cr-actions__end" onClick={() => setDeleteTarget(post)} type="button"><Icon name="trash" /></button>
                  ) : (
                    <button aria-label="Report post" className="cr-act cr-actions__end" onClick={() => { if (requireAccount('sign-in')) setReportTarget({ kind: 'post', id: post.id }); }} type="button"><Icon name="flag" /></button>
                  )}
                </div>
              </div>
            </article>
          );
        }) : null}

        {status === 'ready' && ranked.length > 0 && !focusPostId ? (
          <>
            <div aria-hidden="true" ref={sentinel} />
            <ListFooter ended={!hasMore} failed={moreFailed} loadingMore={loadingMore} onRetry={() => void loadMore()} />
          </>
        ) : null}
      </div>

      {!focusPostId ? (
        <button aria-label="New anonymous post" className="cr-fab" onClick={openCreate} type="button"><Icon name="plus" /></button>
      ) : null}

      <CommentsSheet
        canCompose={Boolean(account)}
        comments={sheetComments}
        composeDisabledReason={isGuest ? <button className="cr-link" onClick={() => requireAccount('sign-in')} type="button">Sign in to comment</button> : undefined}
        composerAvatar={<AnonAvatar size="s" />}
        context={commentsFor ? `Anonymous${topicOf(commentsFor) ? ` · ${topicOf(commentsFor)}` : ''}` : undefined}
        count={commentsFor?.comments_count ?? 0}
        note="Comments here are anonymous too."
        onClose={() => setCommentsFor(null)}
        onReport={account ? (comment) => setReportTarget({ kind: 'comment', id: comment.id }) : undefined}
        onRetry={() => { if (commentsFor) void loadComments(commentsFor); }}
        onSubmit={submitComment}
        open={Boolean(commentsFor)}
        placeholder="Comment anonymously"
        status={commentsStatus}
      />

      <ReportSheet
        context={reportTarget?.kind === 'comment' ? 'Comment' : 'Post'}
        onClose={() => setReportTarget(null)}
        onSubmit={(reason, details) => submitReport(reason, details)}
        open={Boolean(reportTarget)}
        subject={reportTarget?.kind === 'comment' ? 'comment' : 'post'}
      />

      <ShareSheet
        card={shareTarget ? { text: shareTarget.body, theme: isCardTheme(shareTarget.card_theme) ? shareTarget.card_theme : 'blue-hour', kicker: 'Anonymous' } : undefined}
        onClose={() => setShareTarget(null)}
        open={Boolean(shareTarget)}
        preview={shareTarget ? <><AnonAvatar size="s" /><p>{shareTarget.body}</p></> : null}
        text={shareTarget ? shareTarget.body.slice(0, 140) : ''}
        url={shareTarget && typeof window !== 'undefined' ? `${window.location.origin}/anonymous/posts/${shareTarget.id}` : ''}
      />

      <BottomSheet description="This can’t be undone." onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)} title="Delete your post?">
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setDeleteTarget(null)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l cr-pbtn--danger" disabled={deleting} onClick={() => void confirmDelete()} type="button">{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </BottomSheet>

      <AnonymousNameSheet
        onClose={() => setNameSheet(null)}
        onSaved={(saved) => {
          setIdentity(saved);
          const pending = nameSheet;
          setNameSheet(null);
          pending?.();
        }}
        open={Boolean(nameSheet)}
      />

      {lightbox ? (
        <div aria-label="Photo" aria-modal="true" className="cr-lightbox" onClick={() => setLightbox(null)} role="dialog">
          <button aria-label="Close photo" className="cr-icon-btn" onClick={() => setLightbox(null)} type="button"><Icon name="x" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage media */}
          <img alt="" onClick={(event) => event.stopPropagation()} src={lightbox} />
        </div>
      ) : null}
    </main>
  );
}
