'use client';

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Flag,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { RoomComment, RoomFeedPage, RoomPerson, RoomPost, RoomProfile, RoomScope, RoomStory } from '@/lib/room-contracts';

type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };
type ViewerState =
  | { kind: 'story'; storyIndex: number; itemIndex: number }
  | { kind: 'post'; postId: string };

async function roomRequest<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok) {
    const failure = result as ApiFailure | null;
    throw new Error(failure?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  if (!result || !('data' in result)) throw new Error('The Room service returned an invalid response.');
  return result.data;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'C';
}

function postMedia(post: RoomPost) {
  if (post.mediaItems?.length) return post.mediaItems;
  if (post.mediaUrl) {
    return [{ uri: post.mediaUrl, mediaType: post.mediaType === 'video' ? 'video' as const : 'photo' as const }];
  }
  return [];
}

export function RoomExperience({
  accessToken,
  profile,
  onCreate,
  onNotice,
  onError,
  refreshToken,
  focusPostId = null,
}: {
  accessToken: string;
  profile: { id: string; displayName: string; username: string | null; school: string | null };
  onCreate: () => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  refreshToken: number;
  focusPostId?: string | null;
}) {
  const [scope, setScope] = useState<RoomScope>('for_you');
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [stories, setStories] = useState<RoomStory[]>([]);
  const [people, setPeople] = useState<RoomPerson[]>([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, RoomComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, RoomComment | null>>({});
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [reportModalPost, setReportModalPost] = useState<RoomPost | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [openProfile, setOpenProfile] = useState<RoomProfile | null>(null);
  const [mediaIndex, setMediaIndex] = useState<Record<string, number>>({});
  const [followingById, setFollowingById] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const seenStoriesRef = useRef<Set<string>>(new Set());
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const loadFeed = useCallback(async () => {
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setFeedError('');
    setHasMore(false);
    setNextCursor(null);
    setPosts([]);
    try {
      const result = await roomRequest<RoomFeedPage>(`/api/v1/posts?scope=${scope}`, accessToken);
      if (generation !== generationRef.current) return;
      let nextPosts = result.posts;
      if (focusPostId && !nextPosts.some((post) => post.id === focusPostId)) {
        try {
          const focused = await roomRequest<RoomPost>(`/api/v1/posts/${focusPostId}`, accessToken);
          nextPosts = [focused, ...nextPosts.filter((post) => post.id !== focused.id)];
        } catch {
          onError('That shared post is unavailable.');
        }
      }
      setPosts(nextPosts);
      setHasMore(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
      if (focusPostId) setViewer({ kind: 'post', postId: focusPostId });
    } catch (error) {
      if (generation === generationRef.current) {
        setFeedError(error instanceof Error ? error.message : 'Your feed could not be loaded.');
      }
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  }, [accessToken, focusPostId, onError, scope]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasMore || loadingMoreRef.current) return;
    const generation = generationRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setFeedError('');
    try {
      const result = await roomRequest<RoomFeedPage>(
        `/api/v1/posts?scope=${scope}&cursor=${encodeURIComponent(nextCursor)}`,
        accessToken,
      );
      if (generation !== generationRef.current) return;
      setPosts((current) => {
        const ids = new Set(current.map((post) => post.id));
        return [...current, ...result.posts.filter((post) => !ids.has(post.id))];
      });
      setHasMore(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
    } catch (error) {
      if (generation === generationRef.current) {
        setFeedError(error instanceof Error ? error.message : 'More posts could not be loaded.');
      }
    } finally {
      loadingMoreRef.current = false;
      if (generation === generationRef.current) setLoadingMore(false);
    }
  }, [accessToken, hasMore, nextCursor, scope]);

  const loadStories = useCallback(async () => {
    try {
      const result = await roomRequest<RoomStory[]>('/api/v1/room/stories', accessToken);
      setStories(result.map((story) => ({
        ...story,
        seen: seenStoriesRef.current.has(story.authorId),
      })));
    } catch {
      setStories([]);
    }
  }, [accessToken]);

  const loadPeople = useCallback(async (query = '') => {
    try {
      const path = query.trim() ? `/api/v1/people?q=${encodeURIComponent(query.trim())}` : '/api/v1/people';
      const loaded = await roomRequest<RoomPerson[]>(path, accessToken);
      setPeople(loaded);
      setFollowingById((current) => {
        const next = { ...current };
        for (const person of loaded) next[person.id] = person.following;
        return next;
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'People could not be loaded.');
    }
  }, [accessToken, onError]);

  const loadInvite = useCallback(async () => {
    try {
      const result = await roomRequest<{ url: string }>('/api/v1/invites', accessToken);
      setInviteUrl(result.url);
    } catch {
      setInviteUrl('');
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed, refreshToken]);

  useEffect(() => {
    void loadStories();
    void loadInvite();
  }, [loadInvite, loadStories, refreshToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPeople(peopleQuery); }, 220);
    return () => window.clearTimeout(timer);
  }, [loadPeople, peopleQuery, refreshToken]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || feedError) return;
    const root = sentinel.closest('.content-scroll');
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { root: root instanceof Element ? root : null, rootMargin: '240px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feedError, hasMore, loadMore, loadingMore]);

  const recordEvent = useCallback((eventType: string, postId?: string) => {
    void roomRequest('/api/v1/room/events', accessToken, 'POST', { eventType, postId }).catch(() => undefined);
  }, [accessToken]);

  const patchPost = (postId: string, updater: (post: RoomPost) => RoomPost) => {
    setPosts((current) => current.map((post) => post.id === postId ? updater(post) : post));
    setStories((current) => current.map((story) => ({
      ...story,
      items: story.items.map((item) => item.id === postId ? updater(item) : item),
    })));
    setOpenProfile((current) => current
      ? { ...current, posts: current.posts.map((post) => post.id === postId ? updater(post) : post) }
      : current);
  };

  const findPost = (postId: string) => (
    posts.find((post) => post.id === postId)
    ?? openProfile?.posts.find((post) => post.id === postId)
    ?? stories.flatMap((story) => story.items).find((item) => item.id === postId)
    ?? null
  );

  const mediaPosts = useMemo(
    () => posts.filter((post) => postMedia(post).length > 0),
    [posts],
  );

  const toggleLike = async (post: RoomPost) => {
    try {
      const result = await roomRequest<{ liked: boolean }>(`/api/v1/posts/${post.id}/like`, accessToken, 'POST');
      patchPost(post.id, (item) => ({
        ...item,
        liked: result.liked,
        likes: Math.max(0, item.likes + (result.liked && !item.liked ? 1 : !result.liked && item.liked ? -1 : 0)),
      }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Your reaction could not be saved.');
    }
  };

  const toggleSave = async (post: RoomPost) => {
    try {
      const result = await roomRequest<{ saved: boolean }>(`/api/v1/posts/${post.id}/save`, accessToken, 'POST');
      patchPost(post.id, (item) => ({
        ...item,
        saved: result.saved,
        saves: Math.max(0, item.saves + (result.saved && !item.saved ? 1 : !result.saved && item.saved ? -1 : 0)),
      }));
      onNotice(result.saved ? 'Saved to your collection.' : 'Removed from saved posts.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This post could not be updated.');
    }
  };

  const REPORT_REASONS = [
    'Inappropriate or offensive content',
    'Harassment or bullying',
    'Spam or misleading information',
    'Violation of community guidelines',
  ];

  const sharePost = async (post: RoomPost) => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.authorName} on Commonroom`,
          text: post.caption || `Post by ${post.authorName} on Commonroom`,
          url: postUrl,
        });
        await roomRequest<{ url: string }>(`/api/v1/posts/${post.id}/share`, accessToken, 'POST').catch(() => {});
      } else {
        await navigator.clipboard.writeText(postUrl);
        onNotice('Share link copied to clipboard.');
        await roomRequest<{ url: string }>(`/api/v1/posts/${post.id}/share`, accessToken, 'POST').catch(() => {});
      }
      patchPost(post.id, (item) => ({ ...item, shares: item.shares + 1 }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(postUrl);
        onNotice('Share link copied to clipboard.');
      } catch {
        onError('This post could not be shared.');
      }
    }
  };

  const handleConfirmReport = async (post: RoomPost, reason: string) => {
    try {
      await roomRequest(`/api/v1/posts/${post.id}/report`, accessToken, 'POST', { reason });
      setReportModalPost(null);
      setMenuPostId(null);
      onNotice('Thank you for reporting. Our safety team has been notified.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This post could not be reported.');
    }
  };

  const hidePost = (post: RoomPost) => {
    recordEvent('skip', post.id);
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setMenuPostId(null);
    if (viewer?.kind === 'post' && viewer.postId === post.id) setViewer(null);
    onNotice('We will show you fewer posts like this.');
  };

  const deletePost = async (post: RoomPost) => {
    try {
      await roomRequest(`/api/v1/posts/${post.id}`, accessToken, 'DELETE');
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setMenuPostId(null);
      if (viewer?.kind === 'post' && viewer.postId === post.id) setViewer(null);
      onNotice('Your post was removed.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This post could not be removed.');
    }
  };

  const openComments = async (postId: string) => {
    const next = commentsOpen === postId ? null : postId;
    setCommentsOpen(next);
    if (!next || comments[postId]) return;
    try {
      const loaded = await roomRequest<RoomComment[]>(`/api/v1/posts/${postId}/comments`, accessToken);
      setComments((current) => ({ ...current, [postId]: loaded }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Comments could not be loaded.');
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const draft = (commentDrafts[postId] ?? '').trim();
    if (!draft) return;
    try {
      const parent = replyTo[postId];
      const created = await roomRequest<RoomComment>(`/api/v1/posts/${postId}/comments`, accessToken, 'POST', {
        body: draft,
        parentId: parent?.id,
      });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setReplyTo((current) => ({ ...current, [postId]: null }));
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), created] }));
      patchPost(postId, (item) => ({ ...item, comments: item.comments + 1 }));
      onNotice(parent ? 'Reply posted.' : 'Comment posted.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Your comment could not be posted.');
    }
  };

  const followPerson = async (person: Pick<RoomPerson, 'id' | 'display_name' | 'following'>) => {
    try {
      if (person.following) {
        await roomRequest('/api/v1/follows', accessToken, 'DELETE', { userId: person.id });
        setFollowingById((current) => ({ ...current, [person.id]: false }));
        setPeople((current) => current.map((item) => item.id === person.id
          ? { ...item, following: false, follower_count: Math.max(0, item.follower_count - 1) }
          : item));
        setOpenProfile((current) => current?.id === person.id
          ? { ...current, following: false, follower_count: Math.max(0, current.follower_count - 1) }
          : current);
      } else {
        await roomRequest('/api/v1/follows', accessToken, 'POST', { userId: person.id });
        setFollowingById((current) => ({ ...current, [person.id]: true }));
        setPeople((current) => current.map((item) => item.id === person.id
          ? { ...item, following: true, follower_count: item.follower_count + 1 }
          : item));
        setOpenProfile((current) => current?.id === person.id
          ? { ...current, following: true, follower_count: current.follower_count + 1 }
          : current);
        onNotice(`You follow ${person.display_name}.`);
      }
      void loadStories();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This account could not be updated.');
    }
  };

  const showProfile = async (userId: string) => {
    try {
      setViewer(null);
      const loaded = await roomRequest<RoomProfile>(`/api/v1/people/${userId}`, accessToken);
      setOpenProfile(loaded);
      setFollowingById((current) => ({ ...current, [loaded.id]: loaded.following }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This profile could not be opened.');
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) {
      await loadInvite();
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    onNotice('Invite link copied. Friends who join will follow you.');
  };

  const openStory = (index: number) => {
    const story = stories[index];
    if (!story) return;
    seenStoriesRef.current.add(story.authorId);
    setStories((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, seen: true } : item));
    setViewer({ kind: 'story', storyIndex: index, itemIndex: 0 });
    const first = story.items[0];
    if (first) recordEvent('open', first.id);
  };

  const openMedia = (post: RoomPost) => {
    setViewer({ kind: 'post', postId: post.id });
    recordEvent('open', post.id);
  };

  const activeStory = viewer?.kind === 'story' ? stories[viewer.storyIndex] : null;
  const viewerPost = viewer?.kind === 'post' ? findPost(viewer.postId) : null;
  const activeItem = viewer?.kind === 'story' ? activeStory?.items[viewer.itemIndex] : viewerPost;
  const viewerItems = activeItem ? postMedia(activeItem) : [];
  const viewerMedia = viewerItems[mediaIndex[activeItem?.id ?? ''] ?? 0] ?? viewerItems[0] ?? null;
  const activeMenuPost = menuPostId ? findPost(menuPostId) : null;

  const advanceStory = useCallback((delta: number) => {
    setViewer((current) => {
      if (current?.kind !== 'story') return current;
      const story = stories[current.storyIndex];
      if (!story) return null;
      const nextItem = current.itemIndex + delta;
      if (nextItem >= 0 && nextItem < story.items.length) {
        recordEvent('open', story.items[nextItem].id);
        return { kind: 'story', storyIndex: current.storyIndex, itemIndex: nextItem };
      }
      const nextStory = current.storyIndex + delta;
      if (nextStory >= 0 && nextStory < stories.length) {
        seenStoriesRef.current.add(stories[nextStory].authorId);
        setStories((items) => items.map((item, index) => index === nextStory ? { ...item, seen: true } : item));
        const item = stories[nextStory]?.items[0];
        if (item) recordEvent('open', item.id);
        return { kind: 'story', storyIndex: nextStory, itemIndex: 0 };
      }
      return null;
    });
  }, [recordEvent, stories]);

  const advancePost = useCallback((delta: number) => {
    setViewer((current) => {
      if (current?.kind !== 'post') return current;
      const index = mediaPosts.findIndex((post) => post.id === current.postId);
      const next = mediaPosts[index + delta];
      if (!next) {
        if (delta > 0 && hasMore) void loadMore();
        return current;
      }
      recordEvent('open', next.id);
      if (delta > 0 && index + delta >= mediaPosts.length - 2 && hasMore) void loadMore();
      return { kind: 'post', postId: next.id };
    });
  }, [hasMore, loadMore, mediaPosts, recordEvent]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewer(null);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (viewer.kind === 'story') advanceStory(1);
        else advancePost(1);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (viewer.kind === 'story') advanceStory(-1);
        else advancePost(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advancePost, advanceStory, viewer]);

  const ownStoryIndex = stories.findIndex((story) => story.authorId === profile.id);

  const renderComments = (post: RoomPost) => {
    const thread = comments[post.id] ?? [];
    const roots = thread.filter((comment) => !comment.parent_id);
    const repliesFor = (id: string) => thread.filter((comment) => comment.parent_id === id);
    return (
      <div className="comment-thread">
        {roots.map((comment) => (
          <div className="comment-block" key={comment.id}>
            <p><strong>{comment.author_name}</strong> {comment.body}</p>
            <button className="subtle-link" onClick={() => setReplyTo((current) => ({ ...current, [post.id]: comment }))} type="button">Reply</button>
            {repliesFor(comment.id).map((reply) => (
              <p className="comment-reply" key={reply.id}><strong>{reply.author_name}</strong> {reply.body}</p>
            ))}
          </div>
        ))}
        {replyTo[post.id] ? (
          <p className="comment-replying">
            Replying to {replyTo[post.id]?.author_name}
            <button className="subtle-link" onClick={() => setReplyTo((current) => ({ ...current, [post.id]: null }))} type="button">Cancel</button>
          </p>
        ) : null}
        {post.allowComments === false ? (
          <p className="comment-replying">Comments are turned off.</p>
        ) : (
        <form className="comment-form" onSubmit={(event) => void submitComment(event, post.id)}>
          <input
            aria-label={replyTo[post.id] ? 'Write a reply' : 'Write a comment'}
            maxLength={2000}
            onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
            placeholder={replyTo[post.id] ? `Reply to ${replyTo[post.id]?.author_name}…` : 'Add a thoughtful comment…'}
            value={commentDrafts[post.id] ?? ''}
          />
          <button aria-label="Post comment" type="submit"><Send size={16} /></button>
        </form>
        )}
      </div>
    );
  };

  const renderPost = (post: RoomPost) => {
    const items = postMedia(post);
    const index = Math.min(mediaIndex[post.id] ?? 0, Math.max(0, items.length - 1));
    const media = items[index];
    return (
      <article className="feed-card" key={post.id} onMouseEnter={() => recordEvent('impression', post.id)}>
        <div className="post-header">
          <button className="profile-avatar" onClick={() => void showProfile(post.authorId)} type="button">
            {post.authorAvatar ? <img alt="" src={post.authorAvatar} /> : initials(post.authorName)}
          </button>
          <button className="post-author" onClick={() => void showProfile(post.authorId)} type="button">
            <strong>{post.authorName}</strong>
            <span>@{post.authorUsername} · {post.time}</span>
          </button>
          <button
            className="icon-button subtle post-options-trigger"
            aria-label="Post options"
            onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
            type="button"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
        {post.school ? <div className="post-school">{post.school}</div> : null}
        {post.caption ? <p className="post-caption">{post.caption}</p> : null}
        {post.location ? <div className="post-location"><MapPin size={13} />{post.location}</div> : null}
        {media ? (
          <div className="post-media-wrap">
            <button className="post-media" onClick={() => openMedia(post)} type="button">
              {media.mediaType === 'video' ? (
                <>
                  <video playsInline preload="metadata" src={media.uri} />
                  <span className="video-play"><Play size={18} fill="currentColor" /></span>
                </>
              ) : <img alt="" src={media.uri} />}
            </button>
            {items.length > 1 ? (
              <>
                <button aria-label="Previous photo" className="media-nav prev" onClick={() => setMediaIndex((current) => ({ ...current, [post.id]: Math.max(0, index - 1) }))} type="button"><ChevronLeft size={16} /></button>
                <button aria-label="Next photo" className="media-nav next" onClick={() => setMediaIndex((current) => ({ ...current, [post.id]: Math.min(items.length - 1, index + 1) }))} type="button"><ChevronRight size={16} /></button>
                <span className="media-count">{index + 1}/{items.length}</span>
              </>
            ) : null}
          </div>
        ) : null}
        {post.pollOptions?.length ? (
          <div className="poll-preview">{post.pollOptions.map((option) => <span key={option}>{option}</span>)}</div>
        ) : null}
        {post.tags.length ? <div className="post-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        <div className="post-actions">
          <button className={post.liked ? 'post-action liked' : 'post-action'} onClick={() => void toggleLike(post)} type="button"><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />{post.likes}</button>
          <button className="post-action" onClick={() => void openComments(post.id)} type="button"><MessageCircle size={17} />{post.comments}</button>
          <button className={post.saved ? 'post-action liked' : 'post-action'} onClick={() => void toggleSave(post)} type="button"><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} />Save</button>
          <button className="post-action" onClick={() => void sharePost(post)} type="button"><Share2 size={17} />Share</button>
        </div>
        {commentsOpen === post.id ? renderComments(post) : null}
      </article>
    );
  };

  return (
    <div className="home-layout">
      <section className="feed-column">
        <div className="stories-rail" aria-label="Stories">
          <button className="story-chip add-story" onClick={() => (ownStoryIndex >= 0 ? openStory(ownStoryIndex) : onCreate())} type="button">
            <span className="story-avatar">{initials(profile.displayName)}<i><Plus size={11} /></i></span>
            <span>Your story</span>
          </button>
          {stories.filter((story) => story.authorId !== profile.id).map((story) => {
            const storyIndex = stories.findIndex((item) => item.authorId === story.authorId);
            return (
              <button className={story.seen ? 'story-chip seen' : 'story-chip'} key={story.authorId} onClick={() => openStory(storyIndex)} type="button">
                <span className="story-avatar">
                  {story.authorAvatar ? <img alt="" src={story.authorAvatar} /> : initials(story.authorName)}
                </span>
                <span>{story.authorName.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="feed-tabs" role="tablist" aria-label="Feed">
          {([['for_you', 'For You'], ['following', 'Following'], ['general', 'General']] as [RoomScope, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={scope === id} className={scope === id ? 'feed-tab active' : 'feed-tab'} onClick={() => setScope(id)} type="button">{label}</button>
          ))}
        </div>

        {loading ? <div className="feed-status">Loading Room…</div> : null}
        {!loading && posts.length === 0 && !feedError ? (
          <div className="empty-state">
            <span className="empty-icon"><Users size={24} /></span>
            <h2>Your feed is ready for its first post</h2>
            <p>Follow people or share a photo so Room has something to show.</p>
            <button className="secondary-button" onClick={onCreate} type="button">Create a post</button>
          </div>
        ) : null}

        {posts.map((post) => renderPost(post))}

        {feedError ? (
          <div className="feed-status retry" role="alert">
            <span>{feedError}</span>
            <button className="secondary-button" onClick={() => void (nextCursor ? loadMore() : loadFeed())} type="button">Retry</button>
          </div>
        ) : null}
        {loadingMore ? <div className="feed-status">Loading more…</div> : null}
        {!loading && posts.length > 0 && !hasMore && !feedError ? <div className="feed-status">You’re caught up.</div> : null}
        <div ref={sentinelRef} />
      </section>

      <aside className="right-rail">
        <section className="rail-card welcome-card">
          <span className="eyebrow">WELCOME TO YOUR SPACE</span>
          <h2>Good to have you here, {profile.displayName.split(' ')[0]}.</h2>
          <p>Follow classmates, share a story, and keep Room moving.</p>
          <button className="text-link" onClick={onCreate} type="button">Share something <span>→</span></button>
        </section>
        <section className="rail-card">
          <div className="rail-title"><h2>Add people</h2><UserPlus size={17} /></div>
          <label className="people-search">
            <Search size={14} />
            <input
              aria-label="Search people"
              onChange={(event) => setPeopleQuery(event.target.value)}
              placeholder="Search students"
              value={peopleQuery}
            />
          </label>
          <div className="people-list">
            {people.slice(0, 6).map((person) => (
              <div className="people-row" key={person.id}>
                <button className="profile-avatar" onClick={() => void showProfile(person.id)} type="button">
                  {person.avatar_url ? <img alt="" src={person.avatar_url} /> : initials(person.display_name)}
                </button>
                <button className="people-identity" onClick={() => void showProfile(person.id)} type="button">
                  <strong>{person.display_name}</strong>
                  <small>@{person.username ?? 'student'}</small>
                </button>
                <button className="compact-button" onClick={() => void followPerson(person)} type="button">
                  {person.following ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="rail-card">
          <div className="rail-title"><h2>Invite friends</h2></div>
          <p>Share a link so friends land in your Following list.</p>
          <button className="compact-button" onClick={() => void copyInvite()} type="button">Copy invite link</button>
        </section>
        <section className="rail-card">
          <div className="rail-title"><h2>Community guidelines</h2><ShieldCheck size={17} /></div>
          <p>Keep posts respectful, protect private information, and report unsafe content.</p>
          <button className="subtle-link" onClick={() => onNotice('Report posts from the menu on any card. Safety tools stay connected to your account.')} type="button">Read the guidelines</button>
        </section>
      </aside>

      {openProfile ? (
        <div className="media-viewer" role="dialog" aria-modal="true" aria-label={`${openProfile.display_name} profile`}>
          <button className="viewer-close" aria-label="Close profile" onClick={() => setOpenProfile(null)} type="button"><X size={18} /></button>
          <div className="viewer-frame profile-frame">
            <div className="people-row">
              <span className="profile-avatar">{openProfile.avatar_url ? <img alt="" src={openProfile.avatar_url} /> : initials(openProfile.display_name)}</span>
              <span>
                <strong>{openProfile.display_name}</strong>
                <small>@{openProfile.username ?? 'student'}</small>
              </span>
              {openProfile.id !== profile.id ? (
                <button className="compact-button" onClick={() => void followPerson(openProfile)} type="button">
                  {openProfile.following ? 'Following' : 'Follow'}
                </button>
              ) : null}
            </div>
            {openProfile.school ? <p className="post-school">{openProfile.school}</p> : null}
            {openProfile.bio ? <p className="post-caption">{openProfile.bio}</p> : null}
            <p className="feed-status">{openProfile.follower_count} followers</p>
            <div className="profile-posts">{openProfile.posts.slice(0, 8).map((post) => renderPost(post))}</div>
          </div>
        </div>
      ) : null}

      {viewer && activeItem && viewerMedia ? (
        <div
          className="media-viewer spotlight"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            if (touch) swipeRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const start = swipeRef.current;
            const touch = event.changedTouches[0];
            swipeRef.current = null;
            if (!start || !touch) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
            const delta = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 1 : -1) : (dx < 0 ? 1 : -1);
            if (viewer.kind === 'story') advanceStory(delta);
            else advancePost(delta);
          }}
        >
          <button className="viewer-close" aria-label="Close viewer" onClick={() => setViewer(null)} type="button"><X size={18} /></button>
          {viewer.kind === 'story' ? (
            <>
              <button className="viewer-nav prev" aria-label="Previous" onClick={() => advanceStory(-1)} type="button" />
              <button className="viewer-nav next" aria-label="Next" onClick={() => advanceStory(1)} type="button" />
            </>
          ) : (
            <>
              <button className="viewer-nav prev" aria-label="Previous post" onClick={() => advancePost(-1)} type="button" />
              <button className="viewer-nav next" aria-label="Next post" onClick={() => advancePost(1)} type="button" />
            </>
          )}
          <div className="viewer-frame">
            {viewer.kind === 'story' && activeStory ? (
              <div className="viewer-progress">
                {activeStory.items.map((item, index) => (
                  <i className={index <= (viewer.itemIndex) ? 'on' : ''} key={item.id} />
                ))}
              </div>
            ) : null}
            <button className="viewer-author" onClick={() => void showProfile(activeItem.authorId)} type="button">{activeItem.authorName}</button>
            {viewerMedia.mediaType === 'video' ? (
              <video
                autoPlay
                controls
                playsInline
                src={viewerMedia.uri}
                onEnded={() => {
                  recordEvent('watch_complete', activeItem.id);
                  if (viewer.kind === 'story') advanceStory(1);
                  else advancePost(1);
                }}
              />
            ) : (
              <img alt="" src={viewerMedia.uri} />
            )}
            {activeItem.caption ? <p>{activeItem.caption}</p> : null}
            <div className="viewer-actions">
              <button className={activeItem.liked ? 'post-action liked' : 'post-action'} onClick={() => void toggleLike(activeItem)} type="button"><Heart size={16} fill={activeItem.liked ? 'currentColor' : 'none'} />{activeItem.likes}</button>
              <button className="post-action" onClick={() => void openComments(activeItem.id)} type="button"><MessageCircle size={16} />{activeItem.comments}</button>
              <button className={activeItem.saved ? 'post-action liked' : 'post-action'} onClick={() => void toggleSave(activeItem)} type="button"><Bookmark size={16} fill={activeItem.saved ? 'currentColor' : 'none'} /></button>
              <button className="post-action" onClick={() => void sharePost(activeItem)} type="button"><Share2 size={16} /></button>
            </div>
            {commentsOpen === activeItem.id ? renderComments(activeItem) : null}
          </div>
        </div>
      ) : viewer && activeItem && !viewerMedia ? (
        <div className="media-viewer" role="dialog" aria-modal="true" aria-label="Post">
          <button className="viewer-close" aria-label="Close viewer" onClick={() => setViewer(null)} type="button"><X size={18} /></button>
          <div className="viewer-frame">{renderPost(activeItem)}</div>
        </div>
      ) : null}

      {/* Modern Post Options Bottom Sheet */}
      {activeMenuPost ? (
        <div className="post-options-backdrop" onClick={() => setMenuPostId(null)}>
          <div className="post-options-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Post options">
            <div className="post-options-handle" />
            <div className="post-options-list">
              {activeMenuPost.authorId !== profile.id ? (
                <button
                  className="post-option-item"
                  onClick={() => {
                    void followPerson({
                      id: activeMenuPost.authorId,
                      display_name: activeMenuPost.authorName,
                      following: followingById[activeMenuPost.authorId] === true,
                    });
                    setMenuPostId(null);
                  }}
                  type="button"
                >
                  {followingById[activeMenuPost.authorId] ? (
                    <>
                      <UserCheck size={19} />
                      <span>Unfollow @{activeMenuPost.authorUsername}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={19} />
                      <span>Follow @{activeMenuPost.authorUsername}</span>
                    </>
                  )}
                </button>
              ) : null}

              <button
                className="post-option-item"
                onClick={() => {
                  void sharePost(activeMenuPost);
                  setMenuPostId(null);
                }}
                type="button"
              >
                <Share2 size={19} />
                <span>Share via link</span>
              </button>

              <button
                className="post-option-item"
                onClick={() => hidePost(activeMenuPost)}
                type="button"
              >
                <EyeOff size={19} />
                <span>Not interested in this post</span>
              </button>

              {activeMenuPost.authorId !== profile.id ? (
                <button
                  className="post-option-item"
                  onClick={() => {
                    setReportModalPost(activeMenuPost);
                    setMenuPostId(null);
                  }}
                  type="button"
                >
                  <Flag size={19} />
                  <span>Report post</span>
                </button>
              ) : null}

              {activeMenuPost.authorId === profile.id ? (
                <button
                  className="post-option-item destructive"
                  onClick={() => void deletePost(activeMenuPost)}
                  type="button"
                >
                  <Trash2 size={19} />
                  <span>Delete post</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Post Safety Reporting Modal */}
      {reportModalPost ? (
        <div className="post-options-backdrop" onClick={() => setReportModalPost(null)}>
          <div className="post-options-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Report post">
            <div className="post-options-handle" />
            <div className="post-options-header">
              <strong>Report post</strong>
              <button
                className="icon-button subtle"
                onClick={() => setReportModalPost(null)}
                aria-label="Close"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <p className="post-report-subtitle">
              Why are you reporting this post from @{reportModalPost.authorUsername}?
            </p>
            <div className="post-report-reasons">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  className="post-report-reason-btn"
                  onClick={() => void handleConfirmReport(reportModalPost, reason)}
                  type="button"
                >
                  <span>{reason}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
