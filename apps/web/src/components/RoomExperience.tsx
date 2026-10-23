'use client';

import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  EyeOff,
  Flag,
  Heart,
  ImagePlus,
  MapPin,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Music,
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
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { RoomComment, RoomFeedPage, RoomPerson, RoomPost, RoomProfile, RoomScope, RoomStory } from '@/lib/room-contracts';
import { demoRoomPosts, demoRoomStories } from '@/lib/demo-content';

type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };
type ViewerState =
  | { kind: 'story'; storyIndex: number; itemIndex: number }
  | { kind: 'post'; postId: string }
  | { kind: 'photo'; postId: string }
  | { kind: 'reel'; postId: string };

type RoomFeedSection = 'For You' | 'General' | 'Trending / Conversations';
const roomFeedSections: RoomFeedSection[] = ['For You', 'General', 'Trending / Conversations'];

function formatCount(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return (num ?? 0).toString();
}

async function roomRequest<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function renderWithMentions(text: string, onMentionClick?: (username: string) => void) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span
          key={i}
          className="mention-chip"
          onClick={(e) => {
            e.stopPropagation();
            onMentionClick?.(username);
          }}
          role="button"
          tabIndex={0}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className="hashtag-chip">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function RoomExperience({
  accessToken,
  profile,
  onCreate,
  onNotice,
  onError,
  refreshToken,
  focusPostId = null,
  isGuest = false,
  onRequireAccount,
  onOpenSearch,
  onOpenNotifications,
  onOpenAccountMenu,
  hasUnreadNotifications = false,
}: {
  accessToken: string;
  profile: { id: string; displayName: string; username: string | null; school: string | null };
  onCreate: () => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  refreshToken: number;
  focusPostId?: string | null;
  isGuest?: boolean;
  onRequireAccount?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenAccountMenu?: () => void;
  hasUnreadNotifications?: boolean;
}) {
  const [feedSection, setFeedSection] = useState<RoomFeedSection>('For You');
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

  // TikTok / Reels active post index
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Modals & Sheets
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
  const [pausedPosts, setPausedPosts] = useState<Record<string, boolean>>({});
  const [heartBurst, setHeartBurst] = useState<{ id: string; key: number } | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [storyReplyDraft, setStoryReplyDraft] = useState('');
  const [storyLiked, setStoryLiked] = useState<Record<string, boolean>>({});
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const pool: { id: string; name: string; username: string; avatar?: string | null }[] = [];
    const seen = new Set<string>();
    for (const p of people) {
      if (p.username && !seen.has(p.username.toLowerCase())) {
        seen.add(p.username.toLowerCase());
        pool.push({
          id: p.id,
          name: p.display_name,
          username: p.username,
          avatar: p.avatar_url,
        });
      }
    }
    for (const post of posts) {
      if (post.authorUsername && !seen.has(post.authorUsername.toLowerCase())) {
        seen.add(post.authorUsername.toLowerCase());
        pool.push({
          id: post.authorId,
          name: post.authorName,
          username: post.authorUsername,
          avatar: post.authorAvatar,
        });
      }
    }
    return pool
      .filter((u) => u.username.toLowerCase().includes(mentionQuery) || u.name.toLowerCase().includes(mentionQuery))
      .slice(0, 5);
  }, [mentionQuery, people, posts]);

  const insertMention = (postId: string, username: string) => {
    const current = commentDrafts[postId] ?? '';
    const updated = current.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `);
    setCommentDrafts((cur) => ({ ...cur, [postId]: updated }));
    setMentionQuery(null);
  };

  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const seenStoriesRef = useRef<Set<string>>(new Set());
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastWheelTime = useRef<number>(0);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; postId: string }>({ time: 0, postId: '' });

  const displayedPosts = useMemo(() => {
    if (feedSection === 'Trending / Conversations') {
      return [...posts].sort((a, b) => {
        const scoreA = (a.likes || 0) + (a.comments || 0) * 2 + (a.shares || 0) * 3;
        const scoreB = (b.likes || 0) + (b.comments || 0) * 2 + (b.shares || 0) * 3;
        return scoreB - scoreA;
      });
    }
    return posts;
  }, [feedSection, posts]);

  const videoPosts = useMemo(() => {
    const vList = displayedPosts.filter((p) => {
      const items = postMedia(p);
      return items.some((it) => it.mediaType === 'video');
    });
    return vList.length > 0 ? vList : displayedPosts;
  }, [displayedPosts]);

  const [reelViewerOffset, setReelViewerOffset] = useState(0);
  const reelTouchStartY = useRef<number | null>(null);
  const lastReelWheelTime = useRef<number>(0);

  const activePost = displayedPosts[activeIndex] ?? displayedPosts[0] ?? null;

  const loadFeed = useCallback(async () => {
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setFeedError('');
    setHasMore(false);
    setNextCursor(null);
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
      const finalPosts = nextPosts.length ? nextPosts : demoRoomPosts;
      setPosts(finalPosts);
      setHasMore(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
      setActiveIndex(0);
    } catch (error) {
      if (generation === generationRef.current) {
        setPosts(demoRoomPosts);
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
      const result = accessToken
        ? await roomRequest<RoomStory[]>('/api/v1/room/stories', accessToken)
        : [];
      const storiesToShow = result.length ? result : demoRoomStories;
      setStories(storiesToShow.map((story) => ({
        ...story,
        seen: seenStoriesRef.current.has(story.authorId),
      })));
    } catch {
      setStories(demoRoomStories.map((story) => ({
        ...story,
        seen: seenStoriesRef.current.has(story.authorId),
      })));
    }
  }, [accessToken]);

  const loadPeople = useCallback(async (query = '') => {
    if (!accessToken) {
      setPeople([]);
      return;
    }
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
    if (!accessToken) {
      setInviteUrl('');
      return;
    }
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

  const recordEvent = useCallback((eventType: string, postId?: string) => {
    if (!accessToken) return;
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

  const advancePost = useCallback((delta: number) => {
    setActiveIndex((current) => {
      const next = Math.max(0, Math.min(current + delta, displayedPosts.length - 1));
      if (next !== current) {
        const post = displayedPosts[next];
        if (post) recordEvent('open', post.id);
        // Pre-load more if near end
        if (next >= displayedPosts.length - 2 && hasMore) {
          void loadMore();
        }
      }
      return next;
    });
  }, [displayedPosts, hasMore, loadMore, recordEvent]);

  // Keyboard navigation for reels flow (TikTok / Instagram style)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      if (viewer) return; // Story viewer handles its own keys
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        advancePost(1);
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        advancePost(-1);
      } else if (event.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advancePost, viewer]);

  // Mouse wheel navigation with debounce
  const handleReelWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 25) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 360) return;
    lastWheelTime.current = now;
    if (e.deltaY > 0) {
      advancePost(1);
    } else {
      advancePost(-1);
    }
  };

  // Touch swipe navigation for mobile (smooth TikTok real-time drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    let delta = currentY - touchStartY.current;

    // Resistance at feed boundaries
    if (activeIndex === 0 && delta > 0) {
      delta *= 0.3;
    } else if (activeIndex >= displayedPosts.length - 1 && delta < 0) {
      delta *= 0.3;
    }

    touchDeltaY.current = delta;
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const delta = touchDeltaY.current;
    touchStartY.current = null;
    setIsDragging(false);
    setDragOffset(0);

    if (delta < -45 && activeIndex < displayedPosts.length - 1) {
      advancePost(1);
    } else if (delta > 45 && activeIndex > 0) {
      advancePost(-1);
    }
  };

  const handleMediaTap = (post: RoomPost) => {
    const now = Date.now();
    const DOUBLE_TAP_GAP = 220;
    if (lastTapRef.current.postId === post.id && (now - lastTapRef.current.time) < DOUBLE_TAP_GAP) {
      // Double tap → heart burst + like
      setHeartBurst({ id: post.id, key: Date.now() });
      if (!post.liked) {
        void toggleLike(post);
      }
      lastTapRef.current = { time: 0, postId: '' };
    } else {
      lastTapRef.current = { time: now, postId: post.id };
      const items = postMedia(post);
      const item = items[mediaIndex[post.id] ?? 0];
      const isVideo = item?.mediaType === 'video' || post.mediaType === 'video';
      if (isVideo) {
        // Single tap on video → full screen TikTok/Reels viewer with swipe up/down
        setTimeout(() => {
          if (Date.now() - lastTapRef.current.time >= DOUBLE_TAP_GAP) {
            setViewer({ kind: 'reel', postId: post.id });
          }
        }, DOUBLE_TAP_GAP);
      } else {
        // Single tap on photo → Instagram photo viewer modal
        setTimeout(() => {
          if (Date.now() - lastTapRef.current.time >= DOUBLE_TAP_GAP) {
            setViewer({ kind: 'photo', postId: post.id });
          }
        }, DOUBLE_TAP_GAP);
      }
    }
  };

  const toggleLike = async (post: RoomPost) => {
    const nextLiked = !post.liked;
    const nextLikes = Math.max(0, post.likes + (nextLiked ? 1 : -1));
    patchPost(post.id, (item) => ({
      ...item,
      liked: nextLiked,
      likes: nextLikes,
    }));

    if (isGuest || !accessToken) {
      onNotice(nextLiked ? 'Liked! Sign in to sync across devices' : 'Unliked');
      return;
    }

    try {
      const result = await roomRequest<{ liked: boolean }>(`/api/v1/posts/${post.id}/like`, accessToken, 'POST');
      if (result.liked !== nextLiked) {
        patchPost(post.id, (item) => ({
          ...item,
          liked: result.liked,
          likes: Math.max(0, item.likes + (result.liked ? 1 : -1)),
        }));
      }
    } catch (error) {
      patchPost(post.id, (item) => ({
        ...item,
        liked: post.liked,
        likes: post.likes,
      }));
      onError(error instanceof Error ? error.message : 'Your reaction could not be saved.');
    }
  };

  const toggleSave = async (post: RoomPost) => {
    const nextSaved = !post.saved;
    const nextSaves = Math.max(0, (post.saves || 0) + (nextSaved ? 1 : -1));
    patchPost(post.id, (item) => ({
      ...item,
      saved: nextSaved,
      saves: nextSaves,
    }));
    onNotice(nextSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');

    if (isGuest || !accessToken) return;

    try {
      const result = await roomRequest<{ saved: boolean }>(`/api/v1/posts/${post.id}/save`, accessToken, 'POST');
      if (result.saved !== nextSaved) {
        patchPost(post.id, (item) => ({
          ...item,
          saved: result.saved,
          saves: Math.max(0, (item.saves || 0) + (result.saved ? 1 : -1)),
        }));
      }
    } catch (error) {
      patchPost(post.id, (item) => ({
        ...item,
        saved: post.saved,
        saves: post.saves,
      }));
      onError(error instanceof Error ? error.message : 'This post could not be updated.');
    }
  };

  const votePoll = async (post: RoomPost, optionIndex: number) => {
    if (isGuest) {
      onRequireAccount?.();
      return;
    }
    const currentVotes = post.pollVotes ? [...post.pollVotes] : (post.pollOptions ?? []).map(() => 0);
    const prevOption = post.userPollVote;
    if (prevOption !== null && prevOption !== undefined && prevOption !== optionIndex) {
      currentVotes[prevOption] = Math.max(0, (currentVotes[prevOption] ?? 1) - 1);
    }
    if (prevOption !== optionIndex) {
      currentVotes[optionIndex] = (currentVotes[optionIndex] ?? 0) + 1;
    }
    const nextTotal = currentVotes.reduce((sum, count) => sum + count, 0);

    patchPost(post.id, (item) => ({
      ...item,
      userPollVote: optionIndex,
      pollVotes: currentVotes,
      totalPollVotes: nextTotal,
    }));

    if (!accessToken) return;

    try {
      const result = await roomRequest<{
        pollVotes: number[];
        userPollVote: number;
        totalPollVotes: number;
      }>(`/api/v1/posts/${post.id}/poll-vote`, accessToken, 'POST', { optionIndex });

      patchPost(post.id, (item) => ({
        ...item,
        userPollVote: result.userPollVote,
        pollVotes: result.pollVotes,
        totalPollVotes: result.totalPollVotes,
      }));
      onNotice('Vote recorded!');
    } catch (error) {
      patchPost(post.id, (item) => ({
        ...item,
        userPollVote: post.userPollVote,
        pollVotes: post.pollVotes,
        totalPollVotes: post.totalPollVotes,
      }));
      onError(error instanceof Error ? error.message : 'Could not record your vote.');
    }
  };

  const sharePost = async (post: RoomPost) => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.authorName} on Commonroom`,
          text: post.caption,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        onNotice('Post link copied to clipboard');
      }
      patchPost(post.id, (item) => ({ ...item, shares: (item.shares || 0) + 1 }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(postUrl);
        onNotice('Post link copied to clipboard');
      } catch {
        onError('This post could not be shared.');
      }
    }
  };

  const handleConfirmReport = async (post: RoomPost, reason: string) => {
    if (isGuest) {
      onRequireAccount?.();
      return;
    }
    try {
      await roomRequest(`/api/v1/posts/${post.id}/report`, accessToken, 'POST', { reason });
      setReportModalPost(null);
      setMenuPostId(null);
      onNotice('Thank you for reporting. Campus safety has been notified.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This post could not be reported.');
    }
  };

  const hidePost = (post: RoomPost) => {
    recordEvent('skip', post.id);
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setMenuPostId(null);
    setActiveIndex((current) => Math.max(0, current - 1));
    onNotice('We will show you fewer posts like this');
  };

  const deletePost = async (post: RoomPost) => {
    try {
      await roomRequest(`/api/v1/posts/${post.id}`, accessToken, 'DELETE');
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setMenuPostId(null);
      setActiveIndex((current) => Math.max(0, current - 1));
      onNotice('Your post was deleted');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'This post could not be removed.');
    }
  };

  const openComments = async (postId: string) => {
    const next = commentsOpen === postId ? null : postId;
    setCommentsOpen(next);
    if (!next || comments[postId]) return;
    try {
      if (accessToken) {
        const loaded = await roomRequest<RoomComment[]>(`/api/v1/posts/${postId}/comments`, accessToken);
        setComments((current) => ({ ...current, [postId]: loaded }));
      } else {
        // Fallback demo comments for live interactive feel
        setComments((current) => ({
          ...current,
          [postId]: [
            {
              id: `demo-c1-${postId}`,
              post_id: postId,
              author_id: 'demo-user-1',
              author_name: 'Amina S.',
              author_username: 'amina_k',
              body: 'Love this campus moment! Definitely stopping by later 🔥',
              parent_id: null,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: `demo-c2-${postId}`,
              post_id: postId,
              author_id: 'demo-user-2',
              author_name: 'Tunde O.',
              author_username: 'tunde_dev',
              body: 'The lighting on this is so clean! Keep it up 🙌',
              parent_id: null,
              created_at: new Date(Date.now() - 1800000).toISOString(),
            },
          ],
        }));
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Comments could not be loaded.');
    }
  };

  const toggleCommentLike = (commentId: string) => {
    setCommentLikes((cur) => {
      const next = !cur[commentId];
      if (next) onNotice('Liked comment');
      return { ...cur, [commentId]: next };
    });
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const draft = (commentDrafts[postId] ?? '').trim();
    if (!draft) return;
    const parent = replyTo[postId];

    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    setReplyTo((current) => ({ ...current, [postId]: null }));

    if (isGuest || !accessToken) {
      const localComment: RoomComment = {
        id: `guest-${Date.now()}`,
        post_id: postId,
        author_id: profile.id || 'guest-user',
        author_name: profile.displayName || 'You (Campus Guest)',
        author_username: profile.username || 'guest',
        body: draft,
        parent_id: parent?.id ?? null,
        created_at: new Date().toISOString(),
      };
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), localComment] }));
      patchPost(postId, (item) => ({ ...item, comments: item.comments + 1 }));
      onNotice(parent ? 'Reply added locally' : 'Comment added! Sign in to publish publicly.');
      return;
    }

    try {
      const created = await roomRequest<RoomComment>(`/api/v1/posts/${postId}/comments`, accessToken, 'POST', {
        body: draft,
        parentId: parent?.id,
      });
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), created] }));
      patchPost(postId, (item) => ({ ...item, comments: item.comments + 1 }));
      onNotice(parent ? 'Reply posted' : 'Comment posted');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Your comment could not be posted.');
    }
  };

  const followPerson = async (person: Pick<RoomPerson, 'id' | 'display_name' | 'following'>) => {
    const isNowFollowing = !followingById[person.id];
    setFollowingById((current) => ({ ...current, [person.id]: isNowFollowing }));
    setPeople((current) => current.map((item) => item.id === person.id
      ? { ...item, following: isNowFollowing, follower_count: Math.max(0, item.follower_count + (isNowFollowing ? 1 : -1)) }
      : item));
    setOpenProfile((current) => current?.id === person.id
      ? { ...current, following: isNowFollowing, follower_count: Math.max(0, current.follower_count + (isNowFollowing ? 1 : -1)) }
      : current);
    onNotice(isNowFollowing ? `Following ${person.display_name}` : `Unfollowed student`);

    if (isGuest || !accessToken) return;

    try {
      if (!isNowFollowing) {
        await roomRequest('/api/v1/follows', accessToken, 'DELETE', { userId: person.id });
      } else {
        await roomRequest('/api/v1/follows', accessToken, 'POST', { userId: person.id });
      }
      void loadStories();
    } catch (error) {
      setFollowingById((current) => ({ ...current, [person.id]: !isNowFollowing }));
      onError(error instanceof Error ? error.message : 'This account could not be updated.');
    }
  };

  const showProfile = async (userId: string) => {
    const authorPost = posts.find((p) => p.authorId === userId) || demoRoomPosts.find((p) => p.authorId === userId);
    if (!accessToken) {
      if (authorPost) {
        setOpenProfile({
          id: authorPost.authorId,
          display_name: authorPost.authorName,
          username: authorPost.authorUsername,
          avatar_url: authorPost.authorAvatar ?? null,
          school: authorPost.school || 'Campus Student',
          bio: 'Campus creator & student sharing moments on Commonroom.',
          follower_count: 320,
          following: false,
          posts: posts.filter((p) => p.authorId === userId),
          interests: [],
        });
      }
      return;
    }
    try {
      const loaded = await roomRequest<RoomProfile>(`/api/v1/people/${userId}`, accessToken);
      setOpenProfile(loaded);
      setFollowingById((current) => ({ ...current, [loaded.id]: loaded.following }));
    } catch {
      if (authorPost) {
        setOpenProfile({
          id: authorPost.authorId,
          display_name: authorPost.authorName,
          username: authorPost.authorUsername,
          avatar_url: authorPost.authorAvatar ?? null,
          school: authorPost.school || 'Campus Student',
          bio: 'Campus creator & student sharing moments on Commonroom.',
          follower_count: 280,
          following: followingById[authorPost.authorId] ?? false,
          posts: posts.filter((p) => p.authorId === userId),
          interests: [],
        });
      }
    }
  };

  const showProfileByUsername = async (username: string) => {
    const clean = username.replace(/^@/, '').toLowerCase();
    const existing = posts.find((p) => p.authorUsername.toLowerCase() === clean)
      || demoRoomPosts.find((p) => p.authorUsername.toLowerCase() === clean);
    if (existing) {
      void showProfile(existing.authorId);
      return;
    }
    if (people.length) {
      const matched = people.find((p) => (p.username ?? '').toLowerCase() === clean);
      if (matched) {
        void showProfile(matched.id);
        return;
      }
    }
    if (accessToken) {
      try {
        const found = await roomRequest<RoomPerson[]>(`/api/v1/people?q=${encodeURIComponent(clean)}`, accessToken);
        const exact = found.find((p) => (p.username ?? '').toLowerCase() === clean) || found[0];
        if (exact) {
          void showProfile(exact.id);
          return;
        }
      } catch {
        // ignore
      }
    }
    onNotice(`@${clean}'s profile is not available.`);
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

  // Story progress auto-advance timer
  useEffect(() => {
    if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    if (viewer?.kind === 'story' && !storyReplyDraft) {
      storyTimerRef.current = setTimeout(() => {
        advanceStory(1);
      }, 5500);
    }
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [advanceStory, viewer, storyReplyDraft]);

  const activeStory = viewer?.kind === 'story' ? stories[viewer.storyIndex] : null;
  const activeStoryItem = activeStory?.items[viewer?.kind === 'story' ? viewer.itemIndex : 0] ?? null;
  const activeMenuPost = menuPostId ? posts.find((p) => p.id === menuPostId) ?? null : null;
  const ownStoryIndex = stories.findIndex((story) => story.authorId === profile.id);

  const handleSelectSection = (section: RoomFeedSection) => {
    setFeedSection(section);
    setActiveIndex(0);
    if (section === 'General') {
      setScope('general');
    } else {
      setScope('for_you');
    }
  };

  const REPORT_REASONS = [
    'Inappropriate or offensive content',
    'Harassment or bullying',
    'Spam or misleading information',
    'Violation of campus guidelines',
  ];

  return (
    <div className="room-layout-container">
      <div className="room-feed-main">
        {/* Top Header Bar matching mobile TopBar */}
        <header className="room-topbar">
          <h1 className="room-brand-title">Commonroom</h1>
          <div className="room-topbar-actions">
            <button
              aria-label="Search"
              className="room-topbar-btn"
              onClick={onOpenSearch}
              type="button"
            >
              <Search size={22} strokeWidth={2} />
            </button>
            <button
              aria-label="Notifications"
              className="room-topbar-btn"
              onClick={onOpenNotifications}
              type="button"
            >
              <Bell size={22} strokeWidth={2} />
              {hasUnreadNotifications ? <span className="room-topbar-dot" /> : null}
            </button>
            <button
              aria-label="Account menu"
              className="room-topbar-avatar-btn"
              onClick={onOpenAccountMenu}
              type="button"
            >
              <span className="room-topbar-avatar-circle">
                {profile.displayName ? profile.displayName.slice(0, 1).toUpperCase() : 'Y'}
              </span>
            </button>
          </div>
        </header>

        {/* Stories Bar (RoomStoriesBar) */}
        <div aria-label="Stories" className="room-stories-rail">
          {/* Your Story */}
          <button
            className="room-story-node add-story"
            onClick={() => (isGuest ? onRequireAccount?.() : ownStoryIndex >= 0 ? openStory(ownStoryIndex) : onCreate())}
            type="button"
          >
            <div className="room-story-circle your-story">
              <div className="room-story-avatar-inner">
                {profile.displayName ? profile.displayName.slice(0, 1).toUpperCase() : 'Y'}
              </div>
              <span className="room-story-plus">
                <Plus size={11} strokeWidth={3} />
              </span>
            </div>
            <span className="room-story-name">Your Story</span>
          </button>

          {/* Following / Classmate Stories */}
          {stories.filter((story) => story.authorId !== profile.id).map((story) => {
            const storyIndex = stories.findIndex((item) => item.authorId === story.authorId);
            return (
              <button
                className={`room-story-node ${story.seen ? 'seen' : ''}`}
                key={story.authorId}
                onClick={() => openStory(storyIndex)}
                type="button"
              >
                <div className={`room-story-circle ${story.seen ? 'seen-ring' : 'gradient-ring'}`}>
                  <div className="room-story-avatar-inner">
                    {story.authorAvatar ? (
                      <img alt={story.authorName} height={58} src={story.authorAvatar} width={58} />
                    ) : (
                      <span>{initials(story.authorName)}</span>
                    )}
                  </div>
                </div>
                <span className="room-story-name">@{story.authorUsername || story.authorName.toLowerCase().replace(/\s+/g, '_')}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Tabs / Pills */}
        <div aria-label="Feed sections" className="room-filter-tabs" role="tablist">
          {roomFeedSections.map((section) => {
            const isActive = feedSection === section;
            return (
              <button
                aria-selected={isActive}
                className={`room-filter-pill ${isActive ? 'active' : ''}`}
                key={section}
                onClick={() => handleSelectSection(section)}
                role="tab"
                type="button"
              >
                {section}
              </button>
            );
          })}
        </div>

        {/* Loading / Empty States */}
        {loading ? <div className="feed-status">Loading moments…</div> : null}
        {!loading && displayedPosts.length === 0 && !feedError ? (
          <div className="empty-state">
            <span className="empty-icon"><Users size={24} /></span>
            <h2>{isGuest ? 'Nothing here just yet' : 'Your feed is ready for its first moment'}</h2>
            <p>{isGuest ? 'Sign in to follow classmates and share campus moments.' : 'Follow people or share a photo so Room has something to show.'}</p>
            <button className="secondary-button" onClick={onCreate} type="button">{isGuest ? 'Sign in to post' : 'Create a post'}</button>
          </div>
        ) : null}

        {/* =========================================================================
            TIKTOK / INSTAGRAM REELS VIEWER STAGE
            Continuous vertical scroll / swipe flow with smooth transitions
            ========================================================================= */}
        {displayedPosts.length > 0 ? (
          <div
            className="room-reels-stage"
            onTouchCancel={handleTouchEnd}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            onWheel={handleReelWheel}
          >
            {/* Reels scroll container — translateY with real-time dragOffset drives TikTok smooth swiping */}
            <div
              className="room-reels-track"
              style={{
                transform: `translateY(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.2, 0.85, 0.32, 1)',
              }}
            >
              {displayedPosts.map((post, postIndex) => {
                const isActive = postIndex === activeIndex;
                const items = postMedia(post);
                const itemIndex = Math.min(mediaIndex[post.id] ?? 0, Math.max(0, items.length - 1));
                const currentMedia = items[itemIndex] ?? null;

                return (
                  <article
                    className={`room-reel-card ${isActive ? 'active' : ''}`}
                    key={post.id}
                  >
                    {/* Header Row: Author Badge + Time + Sliders */}
                    <div className="reel-header-row">
                      <button
                        className="reel-author-badge"
                        onClick={() => void showProfile(post.authorId)}
                        type="button"
                      >
                        <div className="reel-avatar">
                          {post.authorAvatar ? (
                            <img alt={post.authorName} height={38} src={post.authorAvatar} width={38} />
                          ) : (
                            <span>{initials(post.authorName)}</span>
                          )}
                        </div>
                        <div className="reel-identity-col">
                          <span className="reel-username">@{post.authorUsername}</span>
                          {post.school ? <span className="reel-school-subtitle">{post.school}</span> : null}
                        </div>
                      </button>

                      <div className="reel-header-right">
                        <span className="reel-time">{post.time}</span>
                        <button
                          aria-label="Post options"
                          className="reel-more-btn"
                          onClick={() => setMenuPostId(post.id)}
                          type="button"
                        >
                          <SlidersHorizontal size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Media Container with Floating Action Rail */}
                    <div className="reel-media-box" onClick={() => handleMediaTap(post)}>
                      {post.pollOptions && post.pollOptions.length > 0 ? (
                        <div className="reel-poll-card" onClick={(e) => e.stopPropagation()}>
                          <div className="reel-poll-header">
                            <span className="reel-poll-badge">📊 Campus Poll</span>
                            <span className="reel-poll-total">
                              {post.totalPollVotes ?? post.pollVotes?.reduce((a, b) => a + b, 0) ?? 0} {((post.totalPollVotes ?? 1) === 1 ? 'vote' : 'votes')}
                            </span>
                          </div>
                          <p className="reel-poll-question">{renderWithMentions(post.caption, showProfileByUsername)}</p>
                          <div className="reel-poll-options">
                            {post.pollOptions.map((option, idx) => {
                              const total = post.totalPollVotes ?? post.pollVotes?.reduce((a, b) => a + b, 0) ?? 0;
                              const votes = post.pollVotes?.[idx] ?? 0;
                              const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                              const hasVoted = post.userPollVote !== null && post.userPollVote !== undefined;
                              const isSelected = post.userPollVote === idx;

                              return (
                                <button
                                  key={idx}
                                  className={`reel-poll-option-btn ${hasVoted ? 'voted' : ''} ${isSelected ? 'selected' : ''}`}
                                  disabled={hasVoted && isSelected}
                                  onClick={() => void votePoll(post, idx)}
                                  type="button"
                                >
                                  {hasVoted ? (
                                    <div
                                      className="reel-poll-progress-fill"
                                      style={{ width: `${pct}%` }}
                                    />
                                  ) : null}
                                  <div className="reel-poll-option-content">
                                    <span className="reel-poll-option-text">
                                      {isSelected ? <Check size={14} className="reel-poll-check" /> : null}
                                      {option}
                                    </span>
                                    {hasVoted ? (
                                      <span className="reel-poll-pct">{pct}%</span>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : !currentMedia ? (
                        <div className="reel-placeholder-media">
                          <p>{renderWithMentions(post.caption, showProfileByUsername)}</p>
                        </div>
                      ) : currentMedia.mediaType === 'video' ? (
                        <div className="reel-video-container">
                          {/* Only autoplay the active reel video */}
                          {isActive ? (
                            <video
                              autoPlay
                              loop
                              muted={isMuted}
                              playsInline
                              preload="auto"
                              ref={(el) => {
                                if (!el) return;
                                if (pausedPosts[post.id]) {
                                  el.pause();
                                } else {
                                  void el.play().catch(() => {});
                                }
                              }}
                              src={currentMedia.uri}
                            />
                          ) : (
                            <video
                              loop
                              muted
                              playsInline
                              preload={Math.abs(postIndex - activeIndex) <= 1 ? 'auto' : 'metadata'}
                              src={currentMedia.uri}
                            />
                          )}
                          <button
                            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                            className="reel-sound-toggle"
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            type="button"
                          >
                            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                          </button>

                          {/* "Watch Reel" pill button — explicit 1-click option to expand */}
                          <button
                            aria-label="Watch full screen reel"
                            className="reel-watch-full-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewer({ kind: 'reel', postId: post.id });
                            }}
                            type="button"
                          >
                            <Maximize2 size={12} strokeWidth={2.4} />
                            <span>Watch Reel</span>
                          </button>
                        </div>
                      ) : (
                        <img
                          alt={post.caption || 'Campus reel moment'}
                          className="reel-img"
                          src={currentMedia.uri}
                        />
                      )}

                      {/* Paused Indicator Overlay */}
                      {pausedPosts[post.id] && currentMedia?.mediaType === 'video' ? (
                        <div className="reel-play-paused-overlay">
                          <div className="reel-play-icon-circle">
                            <Play color="#ffffff" fill="#ffffff" size={32} style={{ marginLeft: 3 }} />
                          </div>
                        </div>
                      ) : null}

                      {/* Double Tap Heart Burst Animation */}
                      {heartBurst?.id === post.id ? (
                        <div className="reel-heart-burst" key={heartBurst.key}>
                          <Heart color="#ef4444" fill="#ef4444" size={88} strokeWidth={0} />
                        </div>
                      ) : null}

                      {/* Location Badge Overlay */}
                      {post.location ? (
                        <div className="reel-location-overlay" onClick={(e) => e.stopPropagation()}>
                          <MapPin size={11} strokeWidth={2.4} />
                          <span>{post.location}</span>
                        </div>
                      ) : null}

                      {/* Floating Vertical Action Rail (TikTok / Instagram Right Edge) */}
                      <div className="reel-action-rail">
                        {/* Like Button */}
                        <button
                          aria-label="Like moment"
                          className={`reel-action-btn ${post.liked ? 'liked' : ''}`}
                          onClick={(e) => { e.stopPropagation(); void toggleLike(post); }}
                          type="button"
                        >
                          <Heart
                            color={post.liked ? '#ef4444' : '#ffffff'}
                            fill={post.liked ? '#ef4444' : 'none'}
                            size={24}
                            strokeWidth={1.9}
                          />
                          <span className="reel-action-count">{formatCount(post.likes)}</span>
                        </button>

                        {/* Comments Button -> Opens Slide-over Comments Sheet */}
                        <button
                          aria-label="Open comments"
                          className={`reel-action-btn ${commentsOpen === post.id ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); void openComments(post.id); }}
                          type="button"
                        >
                          <MessageCircle color="#ffffff" size={24} strokeWidth={1.9} />
                          <span className="reel-action-count">{formatCount(post.comments)}</span>
                        </button>

                        {/* Bookmark Button */}
                        <button
                          aria-label="Save moment"
                          className={`reel-action-btn ${post.saved ? 'saved' : ''}`}
                          onClick={(e) => { e.stopPropagation(); void toggleSave(post); }}
                          type="button"
                        >
                          <Bookmark
                            color={post.saved ? '#f59e0b' : '#ffffff'}
                            fill={post.saved ? '#f59e0b' : 'none'}
                            size={24}
                            strokeWidth={1.9}
                          />
                          <span className="reel-action-count">{formatCount(post.saves || 112)}</span>
                        </button>

                        {/* Share Button */}
                        <button
                          aria-label="Share moment"
                          className="reel-action-btn"
                          onClick={(e) => { e.stopPropagation(); void sharePost(post); }}
                          type="button"
                        >
                          <Send className="reel-share-icon" color="#ffffff" size={24} strokeWidth={1.9} />
                          <span className="reel-action-count">{formatCount(post.shares || 34)}</span>
                        </button>
                      </div>

                      {/* Micro Swipe Hint — only on the first post */}
                      {postIndex === 0 && activeIndex === 0 ? (
                        <div className="reel-swipe-indicator">
                          <span>Swipe up or press ↓ for next moment</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Caption & Info Section */}
                    <div className="reel-caption-wrap">
                      <button
                        className="reel-display-name-btn"
                        onClick={() => void showProfile(post.authorId)}
                        type="button"
                      >
                        <strong className="reel-display-name">{post.authorName}</strong>
                      </button>
                      {post.caption ? <p className="reel-caption-text">{renderWithMentions(post.caption, showProfileByUsername)}</p> : null}
                      {post.tags && post.tags.length > 0 ? (
                        <div className="reel-hashtags">
                          {post.tags.map((tag) => (
                            <span className="reel-hashtag" key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop Floating Up / Down Navigation Controls */}
            <div className="room-reel-nav-controls" aria-label="Reel navigation">
              <button
                aria-label="Previous reel moment"
                className="room-reel-nav-btn prev"
                disabled={activeIndex === 0}
                onClick={() => advancePost(-1)}
                title="Previous (Up Arrow)"
                type="button"
              >
                <ChevronUp size={22} strokeWidth={2.5} />
              </button>

              <span className="room-reel-counter">
                {activeIndex + 1} / {displayedPosts.length}
              </span>

              <button
                aria-label="Next reel moment"
                className="room-reel-nav-btn next"
                disabled={activeIndex >= displayedPosts.length - 1}
                onClick={() => advancePost(1)}
                title="Next (Down Arrow)"
                type="button"
              >
                <ChevronDown size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* =========================================================================
          SLIDE-OVER COMMENTS SHEET (Matches mobile RoomCommentsSheet)
          ========================================================================= */}
      {commentsOpen && activePost ? (
        <div className="room-comments-backdrop" onClick={() => setCommentsOpen(null)}>
          <div className="room-comments-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Comments">
            <div className="room-sheet-drag-handle" />
            <div className="room-sheet-header">
              <h3>
                Comments <span className="room-sheet-count">({activePost.comments})</span>
              </h3>
              <button
                aria-label="Close comments"
                className="room-sheet-close-btn"
                onClick={() => setCommentsOpen(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable comments list */}
            <div className="room-comments-scroll">
              {(() => {
                const thread = comments[activePost.id] ?? [];
                const roots = thread.filter((c) => !c.parent_id);
                const repliesFor = (id: string) => thread.filter((c) => c.parent_id === id);

                if (roots.length === 0) {
                  return (
                    <div className="room-comments-empty">
                      <MessageCircle size={32} strokeWidth={1.5} />
                      <strong>No comments yet</strong>
                      <p>Start the conversation with your campus!</p>
                    </div>
                  );
                }

                return roots.map((comment) => (
                  <div className="room-comment-thread" key={comment.id}>
                    <div className="room-comment-row">
                      <div className="room-comment-avatar">
                        <span>{initials(comment.author_name)}</span>
                      </div>
                      <div className="room-comment-body-col">
                        <div className="room-comment-meta">
                          <strong className="room-comment-name">{comment.author_name}</strong>
                          <span className="room-comment-handle">@{comment.author_username}</span>
                        </div>
                        <p className="room-comment-text">{renderWithMentions(comment.body, showProfileByUsername)}</p>
                        <div className="room-comment-actions-bar">
                          <button
                            className="room-comment-reply-btn"
                            onClick={() => {
                              setReplyTo((cur) => ({ ...cur, [activePost.id]: comment }));
                              setCommentDrafts((cur) => ({ ...cur, [activePost.id]: `@${comment.author_username} ` }));
                            }}
                            type="button"
                          >
                            Reply
                          </button>
                          <button
                            aria-label="Like comment"
                            className={`room-comment-like-btn ${commentLikes[comment.id] ? 'liked' : ''}`}
                            onClick={() => toggleCommentLike(comment.id)}
                            type="button"
                          >
                            <Heart
                              color={commentLikes[comment.id] ? '#ef4444' : 'currentColor'}
                              fill={commentLikes[comment.id] ? '#ef4444' : 'none'}
                              size={14}
                            />
                            <span>{commentLikes[comment.id] ? 1 : 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Child replies */}
                    {repliesFor(comment.id).map((reply) => (
                      <div className="room-comment-row reply" key={reply.id}>
                        <div className="room-comment-avatar sm">
                          <span>{initials(reply.author_name)}</span>
                        </div>
                        <div className="room-comment-body-col">
                          <div className="room-comment-meta">
                            <strong className="room-comment-name">{reply.author_name}</strong>
                            <span className="room-comment-handle">@{reply.author_username}</span>
                          </div>
                          <p className="room-comment-text">{renderWithMentions(reply.body, showProfileByUsername)}</p>
                          <div className="room-comment-actions-bar">
                            <button
                              aria-label="Like reply"
                              className={`room-comment-like-btn ${commentLikes[reply.id] ? 'liked' : ''}`}
                              onClick={() => toggleCommentLike(reply.id)}
                              type="button"
                            >
                              <Heart
                                color={commentLikes[reply.id] ? '#ef4444' : 'currentColor'}
                                fill={commentLikes[reply.id] ? '#ef4444' : 'none'}
                                size={13}
                              />
                              <span>{commentLikes[reply.id] ? 1 : 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {/* Reply Target Notice */}
            {replyTo[activePost.id] ? (
              <div className="room-reply-banner">
                <span>Replying to <strong>@{replyTo[activePost.id]?.author_username}</strong></span>
                <button
                  className="room-reply-cancel"
                  onClick={() => setReplyTo((cur) => ({ ...cur, [activePost.id]: null }))}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {/* Mention Autocomplete Menu */}
            {mentionSuggestions.length > 0 ? (
              <div className="mention-autocomplete-menu" role="listbox">
                {mentionSuggestions.map((user) => (
                  <button
                    key={user.id}
                    className="mention-autocomplete-item"
                    onClick={() => insertMention(activePost.id, user.username)}
                    type="button"
                  >
                    <div className="mention-autocomplete-avatar">
                      {user.avatar ? (
                        <img alt={user.name} src={user.avatar} />
                      ) : (
                        <span>{initials(user.name)}</span>
                      )}
                    </div>
                    <div className="mention-autocomplete-info">
                      <span className="mention-autocomplete-name">{user.name}</span>
                      <span className="mention-autocomplete-handle">@{user.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Comment Form */}
            <form className="room-comment-input-form" onSubmit={(e) => void submitComment(e, activePost.id)}>
              <div className="room-comment-my-avatar">
                {profile.displayName ? profile.displayName.slice(0, 1).toUpperCase() : 'Y'}
              </div>
              <input
                aria-label="Add a comment"
                maxLength={1000}
                onChange={(e) => {
                  const val = e.target.value;
                  setCommentDrafts((cur) => ({ ...cur, [activePost.id]: val }));
                  const cursor = e.target.selectionStart ?? val.length;
                  const textBefore = val.slice(0, cursor);
                  const match = textBefore.match(/@([a-zA-Z0-9_]*)$/);
                  if (match) {
                    setMentionQuery(match[1].toLowerCase());
                  } else {
                    setMentionQuery(null);
                  }
                }}
                placeholder={replyTo[activePost.id] ? `Reply to @${replyTo[activePost.id]?.author_username}…` : 'Add a comment… (type @ to mention)'}
                value={commentDrafts[activePost.id] ?? ''}
              />
              <button
                aria-label="Send comment"
                className="room-comment-submit-btn"
                disabled={!(commentDrafts[activePost.id] ?? '').trim()}
                type="submit"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          AUTHOR PROFILE MODAL (Matches mobile RoomAuthorProfileModal)
          ========================================================================= */}
      {openProfile ? (
        <div className="room-profile-backdrop" onClick={() => setOpenProfile(null)}>
          <div className="room-profile-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${openProfile.display_name} profile`}>
            <div className="room-sheet-drag-handle" />
            <button
              aria-label="Close profile"
              className="room-sheet-close-btn"
              onClick={() => setOpenProfile(null)}
              type="button"
            >
              <X size={18} />
            </button>

            <div className="room-profile-hero">
              <div className="room-profile-avatar-lg">
                {openProfile.avatar_url ? (
                  <img alt={openProfile.display_name} height={70} src={openProfile.avatar_url} width={70} />
                ) : (
                  <span>{initials(openProfile.display_name)}</span>
                )}
              </div>
              <h2 className="room-profile-name">{openProfile.display_name}</h2>
              <span className="room-profile-handle">@{openProfile.username || 'student'}</span>

              {openProfile.school ? (
                <div className="room-profile-school-badge">
                  <MapPin size={12} strokeWidth={2.2} />
                  <span>{openProfile.school}</span>
                </div>
              ) : null}

              {openProfile.bio ? <p className="room-profile-bio">{openProfile.bio}</p> : null}

              {/* Stats & Follow Button */}
              <div className="room-profile-stats-row">
                <div className="room-profile-stat-box">
                  <strong>{openProfile.follower_count}</strong>
                  <small>Followers</small>
                </div>
                <div className="room-profile-stat-box">
                  <strong>{openProfile.posts.length}</strong>
                  <small>Moments</small>
                </div>

                {openProfile.id !== profile.id ? (
                  <div className="room-profile-actions-row">
                    <button
                      className={`room-profile-follow-btn ${openProfile.following ? 'following' : ''}`}
                      onClick={() => void followPerson(openProfile)}
                      type="button"
                    >
                      {openProfile.following ? (
                        <>
                          <UserCheck size={15} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                    <button
                      className="room-profile-msg-btn"
                      onClick={() => {
                        onNotice(`Starting chat with @${openProfile.username || 'student'}...`);
                        setOpenProfile(null);
                      }}
                      type="button"
                    >
                      <MessageCircle size={15} />
                      <span>Message</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Author's Shared Moments */}
            <div className="room-profile-moments-section">
              <h3>Shared Moments</h3>
              {openProfile.posts.length === 0 ? (
                <p className="room-profile-no-posts">No moments shared yet.</p>
              ) : (
                <div className="room-profile-posts-grid">
                  {openProfile.posts.map((post) => {
                    const media = postMedia(post);
                    const isVideo = media[0]?.mediaType === 'video';
                    return (
                      <button
                        className="room-profile-grid-item"
                        key={post.id}
                        onClick={() => {
                          if (isVideo) {
                            // Video → open Instagram full-screen reels viewer
                            setViewer({ kind: 'reel', postId: post.id });
                          } else {
                            // Photo → open Instagram photo viewer modal
                            setViewer({ kind: 'photo', postId: post.id });
                          }
                          setOpenProfile(null);
                        }}
                        type="button"
                      >
                        {isVideo ? (
                          <div className="room-profile-grid-video-badge">
                            <Play size={14} fill="#fff" color="#fff" />
                          </div>
                        ) : null}
                        <img alt="" src={post.mediaUrl} />
                        <div className="room-profile-grid-overlay">
                          <span>♥ {post.likes}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          POST OPTIONS MENU (Matches mobile RoomPostOptionsMenu)
          ========================================================================= */}
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
                aria-label="Close"
                className="icon-button subtle"
                onClick={() => setReportModalPost(null)}
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
                  className="post-report-reason-btn"
                  key={reason}
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

      {/* =========================================================================
          FULL-SCREEN POST VIEWER (Instagram-style — tap photo to expand)
          ========================================================================= */}
      {/* =========================================================================
          FULL-SCREEN INSTAGRAM REELS VIEWER (Videos -> Full screen + Swipe up/down)
          ========================================================================= */}
      {(() => {
        if (!viewer) return null;
        const isReelViewer = viewer.kind === 'reel';
        const isPostVideo = viewer.kind === 'post' && (() => {
          const p = posts.find((x) => x.id === viewer.postId) ?? displayedPosts.find((x) => x.id === viewer.postId);
          return p && postMedia(p)[0]?.mediaType === 'video';
        })();
        if (!isReelViewer && !isPostVideo) return null;

        const currentReelPost = videoPosts.find((p) => p.id === viewer.postId)
          ?? displayedPosts.find((p) => p.id === viewer.postId)
          ?? videoPosts[0]
          ?? null;
        if (!currentReelPost) return null;

        const reelMediaList = postMedia(currentReelPost);
        const reelItem = reelMediaList[0] ?? null;
        const reelList = displayedPosts;
        const currentReelIndex = reelList.findIndex((p) => p.id === currentReelPost.id);

        const goNextReel = () => {
          if (currentReelIndex < reelList.length - 1) {
            const nextPost = reelList[currentReelIndex + 1];
            setViewer({ kind: 'reel', postId: nextPost.id });
            setActiveIndex(currentReelIndex + 1);
          }
        };

        const goPrevReel = () => {
          if (currentReelIndex > 0) {
            const prevPost = reelList[currentReelIndex - 1];
            setViewer({ kind: 'reel', postId: prevPost.id });
            setActiveIndex(currentReelIndex - 1);
          }
        };

        return (
          <div
            className="room-fullscreen-reels-backdrop"
            role="dialog"
            aria-label="Full-screen video reel"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewer(null);
              if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goNextReel(); }
              if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goPrevReel(); }
              if (e.key === ' ') {
                e.preventDefault();
                setPausedPosts((cur) => ({ ...cur, [currentReelPost.id]: !cur[currentReelPost.id] }));
              }
              if (e.key === 'm' || e.key === 'M') {
                setIsMuted((m) => !m);
              }
            }}
            onWheel={(e) => {
              const now = Date.now();
              if (now - lastReelWheelTime.current < 450) return;
              if (e.deltaY > 30) {
                lastReelWheelTime.current = now;
                goNextReel();
              } else if (e.deltaY < -30) {
                lastReelWheelTime.current = now;
                goPrevReel();
              }
            }}
            onTouchStart={(e) => {
              reelTouchStartY.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (reelTouchStartY.current === null) return;
              const delta = e.touches[0].clientY - reelTouchStartY.current;
              setReelViewerOffset(delta);
            }}
            onTouchEnd={() => {
              if (reelViewerOffset < -50) {
                goNextReel();
              } else if (reelViewerOffset > 50) {
                goPrevReel();
              }
              setReelViewerOffset(0);
              reelTouchStartY.current = null;
            }}
          >
            {/* Desktop Navigation Floating Buttons (Next / Prev Reel) */}
            <div className="room-fullscreen-reels-desktop-nav">
              <button
                className="room-fullscreen-reels-nav-btn prev"
                onClick={goPrevReel}
                disabled={currentReelIndex <= 0}
                aria-label="Previous reel"
                type="button"
              >
                <ChevronUp size={24} />
              </button>
              <button
                className="room-fullscreen-reels-nav-btn next"
                onClick={goNextReel}
                disabled={currentReelIndex >= reelList.length - 1}
                aria-label="Next reel"
                type="button"
              >
                <ChevronDown size={24} />
              </button>
            </div>

            {/* Video Stage with live drag translateY */}
            <div
              className="room-fullscreen-reels-stage"
              style={{
                transform: `translateY(${reelViewerOffset}px)`,
                transition: reelViewerOffset === 0 ? 'transform 0.28s cubic-bezier(0.2, 0.85, 0.32, 1)' : 'none',
              }}
            >
              {/* Top Controls: Close button + Sound Toggle */}
              <button
                className="room-fullscreen-reels-close"
                onClick={() => setViewer(null)}
                aria-label="Close full-screen reel"
                type="button"
              >
                <X size={22} />
              </button>

              <button
                className="room-fullscreen-reels-sound"
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                type="button"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Video / Photo Player */}
              <div
                className="room-fullscreen-reels-media"
                onClick={() => {
                  setPausedPosts((cur) => ({ ...cur, [currentReelPost.id]: !cur[currentReelPost.id] }));
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setHeartBurst({ id: currentReelPost.id, key: Date.now() });
                  if (!currentReelPost.liked) void toggleLike(currentReelPost);
                }}
              >
                {reelItem?.mediaType === 'video' ? (
                  <video
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    ref={(el) => {
                      if (!el) return;
                      if (pausedPosts[currentReelPost.id]) {
                        el.pause();
                      } else {
                        void el.play().catch(() => {});
                      }
                    }}
                    src={reelItem.uri}
                  />
                ) : reelItem ? (
                  <img
                    alt={currentReelPost.caption || 'Reel moment'}
                    className="room-fullscreen-reels-photo"
                    src={reelItem.uri}
                  />
                ) : (
                  <div className="room-fullscreen-reels-no-video">
                    <p>{currentReelPost.caption}</p>
                  </div>
                )}

                {/* Paused Indicator Overlay */}
                {pausedPosts[currentReelPost.id] ? (
                  <div className="room-fullscreen-reels-paused-overlay">
                    <div className="room-fullscreen-reels-paused-icon">
                      <Play color="#fff" fill="#fff" size={38} style={{ marginLeft: 3 }} />
                    </div>
                  </div>
                ) : null}

                {/* Heart Burst Overlay */}
                {heartBurst?.id === currentReelPost.id ? (
                  <div className="reel-heart-burst" key={heartBurst.key}>
                    <Heart color="#ef4444" fill="#ef4444" size={96} strokeWidth={0} />
                  </div>
                ) : null}
              </div>

              {/* Right Action Rail (Instagram Style) */}
              <div className="room-fullscreen-reels-rail" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`room-fullscreen-reels-action-btn ${currentReelPost.liked ? 'liked' : ''}`}
                  onClick={() => void toggleLike(currentReelPost)}
                  type="button"
                  aria-label="Like reel"
                >
                  <Heart
                    color={currentReelPost.liked ? '#ef4444' : '#ffffff'}
                    fill={currentReelPost.liked ? '#ef4444' : 'none'}
                    size={28}
                  />
                  <span>{formatCount(currentReelPost.likes)}</span>
                </button>

                <button
                  className="room-fullscreen-reels-action-btn"
                  onClick={() => {
                    setViewer(null);
                    void openComments(currentReelPost.id);
                  }}
                  type="button"
                  aria-label="Comments"
                >
                  <MessageCircle color="#ffffff" size={28} />
                  <span>{formatCount(currentReelPost.comments)}</span>
                </button>

                <button
                  className={`room-fullscreen-reels-action-btn ${currentReelPost.saved ? 'saved' : ''}`}
                  onClick={() => void toggleSave(currentReelPost)}
                  type="button"
                  aria-label="Save reel"
                >
                  <Bookmark
                    color={currentReelPost.saved ? '#f59e0b' : '#ffffff'}
                    fill={currentReelPost.saved ? '#f59e0b' : 'none'}
                    size={28}
                  />
                </button>

                <button
                  className="room-fullscreen-reels-action-btn"
                  onClick={() => void sharePost(currentReelPost)}
                  type="button"
                  aria-label="Share reel"
                >
                  <Send color="#ffffff" size={26} />
                </button>
              </div>

              {/* Bottom Info Overlay */}
              <div className="room-fullscreen-reels-bottom" onClick={(e) => e.stopPropagation()}>
                <div className="room-fullscreen-reels-author-row">
                  <button
                    className="room-fullscreen-reels-author-btn"
                    onClick={() => {
                      setViewer(null);
                      void showProfile(currentReelPost.authorId);
                    }}
                    type="button"
                  >
                    <div className="room-fullscreen-reels-avatar">
                      {currentReelPost.authorAvatar ? (
                        <img alt="" height={40} src={currentReelPost.authorAvatar} width={40} />
                      ) : (
                        <span>{initials(currentReelPost.authorName)}</span>
                      )}
                    </div>
                    <div className="room-fullscreen-reels-author-text">
                      <strong>{currentReelPost.authorName}</strong>
                      <span>@{currentReelPost.authorUsername}</span>
                    </div>
                  </button>

                  <button
                    className="room-fullscreen-reels-follow-btn"
                    onClick={() => void followPerson({
                      id: currentReelPost.authorId,
                      display_name: currentReelPost.authorName,
                      following: followingById[currentReelPost.authorId] === true,
                    })}
                    type="button"
                  >
                    {followingById[currentReelPost.authorId] ? 'Following' : 'Follow'}
                  </button>
                </div>

                {currentReelPost.caption ? (
                  <p className="room-fullscreen-reels-caption">{currentReelPost.caption}</p>
                ) : null}

                {/* Audio Ticker */}
                <div className="room-fullscreen-reels-audio-ticker">
                  <Music size={13} />
                  <span>Original audio &bull; {currentReelPost.authorName}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          INSTAGRAM PHOTO MODAL (Tap photo -> Rich details view)
          ========================================================================= */}
      {(() => {
        if (!viewer) return null;
        const isPhotoViewer = viewer.kind === 'photo';
        const isPostPhoto = viewer.kind === 'post' && (() => {
          const p = posts.find((x) => x.id === viewer.postId) ?? displayedPosts.find((x) => x.id === viewer.postId);
          return p && postMedia(p)[0]?.mediaType !== 'video';
        })();
        if (!isPhotoViewer && !isPostPhoto) return null;

        const viewedPost = posts.find((p) => p.id === viewer.postId) ?? displayedPosts.find((p) => p.id === viewer.postId) ?? null;
        if (!viewedPost) return null;
        const viewedMedia = postMedia(viewedPost);
        const viewedIdx = Math.min(mediaIndex[viewedPost.id] ?? 0, Math.max(0, viewedMedia.length - 1));
        const viewedItem = viewedMedia[viewedIdx] ?? null;

        const goMedia = (delta: number) => {
          setMediaIndex((cur) => ({
            ...cur,
            [viewedPost.id]: Math.max(0, Math.min((cur[viewedPost.id] ?? 0) + delta, viewedMedia.length - 1)),
          }));
        };

        return (
          <div
            className="room-post-viewer-backdrop"
            onClick={() => setViewer(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewer(null);
              if (e.key === 'ArrowLeft') goMedia(-1);
              if (e.key === 'ArrowRight') goMedia(1);
            }}
            role="dialog"
            aria-label="Photo viewer"
            tabIndex={0}
          >
            <div className="room-post-viewer-card" onClick={(e) => e.stopPropagation()}>
              <button
                aria-label="Close photo viewer"
                className="room-post-viewer-close"
                onClick={() => setViewer(null)}
                type="button"
              >
                <X size={22} />
              </button>

              <div
                className="room-post-viewer-media"
                onDoubleClick={() => {
                  setHeartBurst({ id: viewedPost.id, key: Date.now() });
                  if (!viewedPost.liked) void toggleLike(viewedPost);
                }}
              >
                {!viewedItem ? (
                  <div className="room-post-viewer-text-only">
                    <p>{viewedPost.caption}</p>
                  </div>
                ) : (
                  <img alt={viewedPost.caption || 'Photo'} src={viewedItem.uri} />
                )}

                {heartBurst?.id === viewedPost.id ? (
                  <div className="reel-heart-burst" key={heartBurst.key}>
                    <Heart color="#ef4444" fill="#ef4444" size={88} strokeWidth={0} />
                  </div>
                ) : null}

                {viewedMedia.length > 1 ? (
                  <>
                    <div className="room-post-viewer-media-dots">
                      {viewedMedia.map((_, i) => (
                        <span
                          className={`room-post-viewer-dot ${i === viewedIdx ? 'active' : ''}`}
                          key={i}
                          onClick={() => setMediaIndex((cur) => ({ ...cur, [viewedPost.id]: i }))}
                        />
                      ))}
                    </div>
                    {viewedIdx > 0 ? (
                      <button
                        className="room-post-viewer-arrow left"
                        onClick={() => goMedia(-1)}
                        type="button"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={28} />
                      </button>
                    ) : null}
                    {viewedIdx < viewedMedia.length - 1 ? (
                      <button
                        className="room-post-viewer-arrow right"
                        onClick={() => goMedia(1)}
                        type="button"
                        aria-label="Next photo"
                      >
                        <ChevronRight size={28} />
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="room-post-viewer-details">
                <div className="room-post-viewer-author">
                  <button
                    className="room-post-viewer-author-btn"
                    onClick={() => { setViewer(null); void showProfile(viewedPost.authorId); }}
                    type="button"
                  >
                    <div className="room-post-viewer-avatar">
                      {viewedPost.authorAvatar ? (
                        <img alt="" src={viewedPost.authorAvatar} width={36} height={36} />
                      ) : (
                        <span>{initials(viewedPost.authorName)}</span>
                      )}
                    </div>
                    <div className="room-post-viewer-author-info">
                      <strong>{viewedPost.authorName}</strong>
                      <span>@{viewedPost.authorUsername}</span>
                    </div>
                  </button>
                  <button
                    className="room-post-viewer-follow-btn"
                    onClick={() => void followPerson({
                      id: viewedPost.authorId,
                      display_name: viewedPost.authorName,
                      following: followingById[viewedPost.authorId] === true,
                    })}
                    type="button"
                  >
                    {followingById[viewedPost.authorId] ? 'Following' : 'Follow'}
                  </button>
                </div>

                {viewedPost.caption ? (
                  <p className="room-post-viewer-caption">{viewedPost.caption}</p>
                ) : null}

                {viewedPost.tags && viewedPost.tags.length > 0 ? (
                  <div className="room-post-viewer-tags">
                    {viewedPost.tags.map((tag) => (
                      <span key={tag} className="room-post-viewer-tag">{tag}</span>
                    ))}
                  </div>
                ) : null}

                {viewedPost.location ? (
                  <div className="room-post-viewer-location">
                    <MapPin size={13} />
                    <span>{viewedPost.location}</span>
                  </div>
                ) : null}

                <span className="room-post-viewer-time">{viewedPost.time}</span>

                <div className="room-post-viewer-actions">
                  <button
                    className={`room-post-viewer-action-btn ${viewedPost.liked ? 'liked' : ''}`}
                    onClick={() => void toggleLike(viewedPost)}
                    type="button"
                  >
                    <Heart
                      color={viewedPost.liked ? '#ef4444' : 'currentColor'}
                      fill={viewedPost.liked ? '#ef4444' : 'none'}
                      size={22}
                    />
                    <span>{formatCount(viewedPost.likes)}</span>
                  </button>

                  <button
                    className="room-post-viewer-action-btn"
                    onClick={() => { setViewer(null); void openComments(viewedPost.id); }}
                    type="button"
                  >
                    <MessageCircle size={22} />
                    <span>{formatCount(viewedPost.comments)}</span>
                  </button>

                  <button
                    className={`room-post-viewer-action-btn ${viewedPost.saved ? 'saved' : ''}`}
                    onClick={() => void toggleSave(viewedPost)}
                    type="button"
                  >
                    <Bookmark
                      color={viewedPost.saved ? '#f59e0b' : 'currentColor'}
                      fill={viewedPost.saved ? '#f59e0b' : 'none'}
                      size={22}
                    />
                  </button>

                  <button
                    className="room-post-viewer-action-btn"
                    onClick={() => void sharePost(viewedPost)}
                    type="button"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          STORY VIEWER MODAL (Matches mobile RoomStoryViewerModal)
          ========================================================================= */}
      {viewer?.kind === 'story' && activeStory && activeStoryItem ? (
        <div className="room-story-viewer-backdrop" role="dialog" aria-label="Story viewer">
          <div className="room-story-viewer-card">
            {/* Top segmented progress bars */}
            <div className="room-story-progress-bar">
              {activeStory.items.map((item, index) => (
                <div className="room-story-progress-seg" key={item.id}>
                  <div className={`room-story-progress-fill ${index < viewer.itemIndex ? 'full' : index === viewer.itemIndex ? 'animating' : ''}`} />
                </div>
              ))}
            </div>

            {/* Story Header */}
            <div className="room-story-viewer-header">
              <button
                className="room-story-viewer-author"
                onClick={() => {
                  setViewer(null);
                  void showProfile(activeStory.authorId);
                }}
                type="button"
              >
                <div className="room-story-viewer-avatar">
                  {activeStory.authorAvatar ? (
                    <img alt="" height={34} src={activeStory.authorAvatar} width={34} />
                  ) : (
                    <span>{initials(activeStory.authorName)}</span>
                  )}
                </div>
                <span>@{activeStory.authorUsername || activeStory.authorName.toLowerCase()}</span>
                <small>{activeStoryItem.time}</small>
              </button>
              <button
                aria-label="Close story"
                className="room-story-viewer-close"
                onClick={() => setViewer(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Story Media */}
            <div className="room-story-media-container">
              {activeStoryItem.mediaType === 'video' ? (
                <video autoPlay playsInline src={activeStoryItem.mediaUrl} />
              ) : (
                <img alt="" src={activeStoryItem.mediaUrl} />
              )}

              {/* Tap Left / Right Zones */}
              <div className="room-story-tap-zone left" onClick={() => advanceStory(-1)} />
              <div className="room-story-tap-zone right" onClick={() => advanceStory(1)} />
            </div>

            {/* Story Footer with Caption, Quick Reactions & Reply Form */}
            <div className="room-story-footer-wrapper">
              {activeStoryItem.caption ? (
                <div className="room-story-caption-overlay">
                  <p>{activeStoryItem.caption}</p>
                </div>
              ) : null}

              {/* Quick Reactions Bar */}
              <div className="room-story-reactions-row">
                {['❤️', '🔥', '😂', '👏', '😮', '🙌'].map((emoji) => (
                  <button
                    key={emoji}
                    className="room-story-reaction-btn"
                    onClick={() => {
                      onNotice(`Sent ${emoji} to @${activeStory.authorUsername || activeStory.authorName}`);
                    }}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Form & Story Like */}
              <div className="room-story-footer-row">
                <form
                  className="room-story-reply-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!storyReplyDraft.trim()) return;
                    onNotice(`Reply sent to @${activeStory.authorUsername || activeStory.authorName}`);
                    setStoryReplyDraft('');
                  }}
                >
                  <input
                    placeholder={`Reply to @${activeStory.authorUsername || activeStory.authorName}…`}
                    value={storyReplyDraft}
                    onChange={(e) => setStoryReplyDraft(e.target.value)}
                    maxLength={300}
                  />
                  {storyReplyDraft.trim() ? (
                    <button aria-label="Send reply" className="room-story-send-btn" type="submit">
                      <Send size={15} />
                    </button>
                  ) : null}
                </form>

                <button
                  aria-label="Like story"
                  className={`room-story-like-btn ${storyLiked[activeStoryItem.id] ? 'liked' : ''}`}
                  onClick={() => {
                    const next = !storyLiked[activeStoryItem.id];
                    setStoryLiked((cur) => ({ ...cur, [activeStoryItem.id]: next }));
                    onNotice(next ? 'Liked story' : 'Unliked story');
                  }}
                  type="button"
                >
                  <Heart
                    color={storyLiked[activeStoryItem.id] ? '#ef4444' : '#ffffff'}
                    fill={storyLiked[activeStoryItem.id] ? '#ef4444' : 'none'}
                    size={22}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
