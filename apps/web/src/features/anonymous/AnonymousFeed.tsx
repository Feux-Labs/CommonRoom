'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
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
import { apiRequest } from '@/features/app/api';
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
import { PostInsightsSheet } from './PostInsightsSheet';
import { SponsoredCard, type Ad } from './SponsoredCard';
import { trackEvent } from '@/lib/analytics';
import { cacheGet, cacheSet } from '@/lib/client-cache';

/** Anonymous feed screen and mockups 15, 18, 19, 71, 72, 73. `focusPostId` shows one shared post. */
/** The photo a shared post should carry in its card: the first photo, unless the author marked the media sensitive. */
function sharePhoto(post: AnonPost): string | undefined {
  const photo = (post.media_items ?? []).find((item) => item.mediaType === 'photo' && !item.sensitive);
  return photo ? anonMediaUrl(photo.path) || undefined : undefined;
}

export function AnonymousFeed({ focusPostId = null, pinPostId = null }: { focusPostId?: string | null; pinPostId?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  // Guests (anonymous sessions) take part too: `account` here means the current visitor, member or guest.
  const { session, isGuest, requireAccount, ensureAdult, ready } = useAppSession();
  const account = session;
  // The last feed this person loaded (if any), so coming back to this tab shows it immediately instead of a skeleton.
  const feedCacheKey = session && !focusPostId ? `anon-feed:${session.user.id}` : null;
  const [cached] = useState(() => (feedCacheKey ? cacheGet<{ posts: AnonPost[]; hasMore: boolean; cursor: string | null }>(feedCacheKey) : undefined));
  const [posts, setPosts] = useState<AnonPost[]>(cached?.posts ?? []);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cached ? 'ready' : 'loading');
  const [cursor, setCursor] = useState<string | null>(cached?.cursor ?? null);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [identity, setIdentity] = useState<AnonIdentity | null | undefined>(undefined);
  const [nameSheet, setNameSheet] = useState<null | (() => void)>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [commentsFor, setCommentsFor] = useState<AnonPost | null>(null);
  const [comments, setComments] = useState<AnonComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reportTarget, setReportTarget] = useState<{ kind: ReportTargetKind; id: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<AnonPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnonPost | null>(null);
  const [insightsFor, setInsightsFor] = useState<AnonPost | null>(null);
  // One sponsored card, if there is one for this person (never for Pro members). A failed lookup just means no ad.
  const [ad, setAd] = useState<Ad | null>(null);
  const [editFor, setEditFor] = useState<AnonPost | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
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
      await Promise.resolve();
      // Show the feed loaded last time right away (when the session was not known yet at first render), then refresh below.
      let shownFromCache = Boolean(cached);
      if (!focusPostId && session && !shownFromCache) {
        const hit = cacheGet<{ posts: AnonPost[]; hasMore: boolean; cursor: string | null }>(`anon-feed:${session.user.id}`);
        if (hit && current === generation.current) {
          setPosts(hit.posts);
          setHasMore(hit.hasMore);
          setCursor(hit.cursor);
          setStatus('ready');
          shownFromCache = true;
        }
      }
      try {
        if (focusPostId) {
          const result = await anonRequest<AnonPost[]>(session, `/posts?scope=all_nigerian_schools&id=${encodeURIComponent(focusPostId)}`);
          if (current !== generation.current) return;
          setPosts(result);
          setHasMore(false);
          setCursor(null);
          if (result.length > 0) trackEvent(session, 'post_view', { kind: 'anonymous', id: focusPostId });
        } else {
          const page = await anonRequest<AnonPostPage>(session, '/posts?scope=all_nigerian_schools&page=1&sort=hot');
          if (current !== generation.current) return;
          const fresh = mergeUnique([], pinFirst(page.posts, pinPostId));
          setPosts(fresh);
          setHasMore(page.hasMore && page.nextCursor !== null);
          setCursor(page.nextCursor);
          if (session) cacheSet(`anon-feed:${session.user.id}`, { posts: fresh, hasMore: page.hasMore && page.nextCursor !== null, cursor: page.nextCursor });
        }
        setStatus('ready');
      } catch {
        // A failed refresh keeps showing what was already on screen from the cache.
        if (current === generation.current && !shownFromCache) setStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, focusPostId, pinPostId, ready, session]);

  useEffect(() => {
    if (!ready || !session || focusPostId) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const found = await apiRequest<Ad | null>('/api/v1/ads?placement=anonymous_feed', { session });
        if (active) setAd(found);
      } catch {
        if (active) setAd(null);
      }
    })();
    return () => { active = false; };
  }, [focusPostId, ready, session]);

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

  // Once per visit: if this phone already has an Anonymous ID, ask whether it is yours before using it.
  const confirmKey = session ? `commonroom:anon-confirmed:${session.user.id}` : null;
  const identityHandle = identity?.handle ?? null;
  useEffect(() => {
    if (!confirmKey || !identityHandle) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      let seen = false;
      try { seen = window.sessionStorage.getItem(confirmKey) === '1'; } catch { seen = false; }
      if (active && !seen) setConfirmOpen(true);
    })();
    return () => { active = false; };
  }, [confirmKey, identityHandle]);
  const markConfirmed = () => {
    if (confirmKey) { try { window.sessionStorage.setItem(confirmKey, '1'); } catch { /* storage unavailable */ } }
    setConfirmOpen(false);
  };

  /** Runs `action` once the user has an account and an anonymous identity. */
  const withIdentity = (action: () => void) => {
    if (!ensureAdult(() => withIdentity(action))) return;
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
    trackEvent(session, 'post_view', { kind: 'anonymous', id: post.id });
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
    if (!ensureAdult()) throw new Error('Quick check first (18+), then send your comment again.');
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

  const saveEdit = async () => {
    if (!editFor || !session || saving) return;
    setSaving(true);
    setEditError('');
    try {
      const result = await anonRequest<{ edited: boolean; body: string }>(session, `/posts/${editFor.id}`, 'PATCH', { body: editText });
      setPosts((current) => current.map((item) => (item.id === editFor.id ? { ...item, body: result.body, edited: true } : item)));
      setEditFor(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Your post could not be edited.');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    if (ensureAdult(() => router.push('/create?to=anonymous'))) router.push('/create?to=anonymous');
  };

  const sheetComments: SheetComment[] = comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parent_comment_id,
    // Each person's Anonymous ID, the name they chose, so people can follow who is who without knowing who they are.
    author: comment.author_handle || 'Anonymous',
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
            <h1 className="cr-hd__big">Anonymous Range</h1>
            <p className="cr-hd__sub">Talk! No one knows who you are.</p>
          </div>
        )}
        <button aria-label="Inbox" className="cr-anon__inbox" onClick={() => router.push('/anonymous/inbox')} type="button">
          <Icon name="inbox" />Inbox
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

        {status === 'ready' ? ranked.map((post, index) => {
          const topic = topicOf(post);
          const photos = (post.media_items ?? []).filter((item) => item.mediaType === 'photo');
          const videos = (post.media_items ?? []).filter((item) => item.mediaType === 'video');
          const sensitiveMedia = (post.media_items ?? []).some((item) => item.sensitive);
          return (
            <Fragment key={post.id}>
            <article className="cr-apost">
              <AnonAvatar />
              <div className="cr-apost__main">
                <p className="cr-apost__meta"><b className="cr-apost__id">{post.author_handle || 'Anonymous'}</b> · {shortAge(post.created_at)}{post.edited ? ' · edited' : ''}{topic ? ` · ${topic}` : ''}</p>
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
                  <button aria-label="Share" className="cr-act" onClick={() => { trackEvent(session, 'post_share', { kind: 'anonymous', id: post.id }); setShareTarget(post); }} type="button"><Icon name="up" /></button>
                  {post.is_mine ? (
                    <>
                    <button aria-label="Edit your post" className="cr-act cr-actions__end" onClick={() => { setEditText(post.body); setEditError(''); setEditFor(post); }} type="button">Edit</button>
                    <button aria-label="Post insights" className="cr-act cr-actions__end" onClick={() => setInsightsFor(post)} type="button">Insights</button>
                    <button aria-label="Delete your post" className="cr-act cr-actions__end" onClick={() => setDeleteTarget(post)} type="button"><Icon name="trash" /></button>
                    </>
                  ) : (
                    <button aria-label="Report post" className="cr-act cr-actions__end" onClick={() => setReportTarget({ kind: 'post', id: post.id })} type="button"><Icon name="flag" /></button>
                  )}
                </div>
              </div>
            </article>
            {ad && !focusPostId && ranked.length >= 2 && index === Math.min(3, ranked.length - 1) ? <SponsoredCard ad={ad} session={session} /> : null}
            </Fragment>
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
        composeDisabledReason={!session ? <button className="cr-link" onClick={() => requireAccount('sign-in')} type="button">Sign in to comment</button> : undefined}
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
        card={shareTarget ? { text: shareTarget.body, theme: isCardTheme(shareTarget.card_theme) ? shareTarget.card_theme : 'blue-hour', kicker: 'Anonymous', image: sharePhoto(shareTarget) } : undefined}
        onClose={() => setShareTarget(null)}
        open={Boolean(shareTarget)}
        preview={shareTarget ? <><AnonAvatar size="s" /><p>{shareTarget.body}</p></> : null}
        text={shareTarget ? shareTarget.body.slice(0, 140) : ''}
        url={shareTarget && typeof window !== 'undefined' ? `${window.location.origin}/anonymous/posts/${shareTarget.id}` : ''}
      />

      <BottomSheet description="Your edit is checked like a new post, and the post will show “edited”." onClose={() => setEditFor(null)} open={Boolean(editFor)} title="Edit your post">
        <textarea aria-label="Post text" className="cr-textarea" maxLength={3000} onChange={(event) => setEditText(event.target.value)} rows={5} value={editText} />
        {editError ? <p role="alert" style={{ color: '#b3261e' }}>{editError}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setEditFor(null)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={saving || !editText.trim() || editText.trim() === editFor?.body} onClick={() => void saveEdit()} type="button">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </BottomSheet>

      <PostInsightsSheet kind="anonymous" onClose={() => setInsightsFor(null)} postId={insightsFor?.id ?? null} session={session} />

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
          markConfirmed();
          const pending = nameSheet;
          setNameSheet(null);
          pending?.();
        }}
        open={Boolean(nameSheet)}
      />

      <BottomSheet description="We found an Anonymous ID on this phone." onClose={markConfirmed} open={confirmOpen && !nameSheet} title="Is this your Anonymous ID?">
        <p className="cr-note"><b>{identity?.handle}</b></p>
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => { setConfirmOpen(false); setSwitchOpen(true); }} type="button">No, use another ID</button>
          <button className="cr-pbtn cr-pbtn--l" onClick={markConfirmed} type="button">Yes, that is me</button>
        </div>
      </BottomSheet>

      <AnonymousNameSheet onClose={() => setSwitchOpen(false)} onSaved={() => setSwitchOpen(false)} open={switchOpen} replacing startAt="restore" />

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
