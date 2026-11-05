'use client';

import {
  Bell,
  Bookmark,
  Check,
  CircleAlert,
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
import { Banner, Button, EmptyState, ErrorState, Header as CRHeader, Skeleton } from '@/components/cr/primitives';
import type { RoomComment, RoomFeedPage, RoomPerson, RoomPost, RoomProfile, RoomScope, RoomStory } from '@/lib/room-contracts';
import { demoRoomStories } from '@/lib/demo-content';

type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };
type ViewerState =
  | { kind: 'story'; storyIndex: number; itemIndex: number }
  | { kind: 'post'; postId: string }
  | { kind: 'photo'; postId: string }
  | { kind: 'reel'; postId: string };

type RoomFeedSection = 'For You' | 'Videos' | 'General' | 'Following';
const roomFeedSections: RoomFeedSection[] = ['For You', 'General', 'Following'];

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
  initialFeedSection = 'For You',
  onOpenProfile,
  theme = 'light',
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
  initialFeedSection?: RoomFeedSection;
  onOpenProfile?: () => void;
  theme?: 'light' | 'dark';
}) {
  const isRoomFeed = initialFeedSection === 'Videos';
  const isDarkTheme = theme === 'dark';
  const [feedSection, setFeedSection] = useState<RoomFeedSection>(initialFeedSection);
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
  const [feedErrorSource, setFeedErrorSource] = useState<'feed' | 'more' | null>(null);
  const [isOnline, setIsOnline] = useState(true);

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
  const loadMoreMarkerRef = useRef<HTMLDivElement | null>(null);

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
    if (feedSection === 'Videos') {
      const v = posts.filter((p) => {
        const items = postMedia(p);
        return items.some((it) => it.mediaType === 'video') || p.mediaType === 'video';
      });
      return v;
    }
    return posts;
  }, [feedSection, posts]);

  const videoPosts = useMemo(() => {
    const vList = posts.filter((p) => {
      const items = postMedia(p);
      return items.some((it) => it.mediaType === 'video') || p.mediaType === 'video';
    });
    return vList.length > 0 ? vList : posts;
  }, [posts]);

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
    setFeedErrorSource(null);
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
      setPosts(nextPosts);
      setHasMore(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
      setActiveIndex(0);
    } catch (error) {
      if (generation === generationRef.current) {
        setFeedError(error instanceof Error ? error.message : 'Your feed could not be loaded.');
        setFeedErrorSource('feed');
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
    setFeedErrorSource(null);
    try {
      const result = await roomRequest<RoomFeedPage>(
        `/api/v1/posts?scope=${scope}&cursor=${encodeURIComponent(nextCursor)}`,
        accessToken,
      );
      if (generation !== generationRef.current) return;
      setPosts((current) => {
        const ids = new Set(current.map((post) => post.id));
        const newPosts = result.posts.filter((post) => {
          if (ids.has(post.id)) return false;
          ids.add(post.id);
          return true;
        });
        return [...current, ...newPosts];
      });
      setHasMore(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
    } catch (error) {
      if (generation === generationRef.current) {
        setFeedError(error instanceof Error ? error.message : 'More posts could not be loaded.');
        setFeedErrorSource('more');
      }
    } finally {
      loadingMoreRef.current = false;
      if (generation === generationRef.current) setLoadingMore(false);
    }
  }, [accessToken, hasMore, nextCursor, scope]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

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
    if ((isRoomFeed && displayedPosts.length > 0) || !hasMore || loading || loadingMore || feedError || !loadMoreMarkerRef.current) return;
    const marker = loadMoreMarkerRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: '400px' });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [displayedPosts.length, feedError, hasMore, isRoomFeed, loadMore, loading, loadingMore]);

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
    if (!isRoomFeed) return;
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
  }, [advancePost, isRoomFeed, viewer]);

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
    const authorPost = posts.find((p) => p.authorId === userId);
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
    const existing = posts.find((p) => p.authorUsername.toLowerCase() === clean);
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
    const nextScope: RoomScope = section === 'General'
      ? 'general'
      : section === 'Following'
        ? 'following'
        : 'for_you';
    if (nextScope !== scope) {
      setPosts([]);
      setFeedError('');
      setFeedErrorSource(null);
      setNextCursor(null);
      setHasMore(false);
      setLoading(true);
    }
    setScope(nextScope);
  };

  const REPORT_REASONS = [
    'Inappropriate or offensive content',
    'Harassment or bullying',
    'Spam or misleading information',
    'Violation of campus guidelines',
  ];

  return (
    <div
      className="room-layout-container cr-ui"
      data-feed-mode={isRoomFeed ? 'room' : 'home'}
      data-theme={theme}
    >
      <div className="room-feed-main">
        {/* Top Header Bar matching mockup Screen 3 & 4 */}
        <CRHeader className="room-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              aria-label="Account menu"
              className="room-topbar-avatar-btn"
              onClick={onOpenAccountMenu}
              type="button"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span className="a36 s" style={{ width: 32, height: 32, borderRadius: '50%', background: '#0b0b0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {profile.displayName ? profile.displayName.slice(0, 1).toUpperCase() : 'Y'}
              </span>
            </button>
            <span style={{ fontSize: 18, fontWeight: 500, color: '#0b0b0b', letterSpacing: '-0.2px' }}>
              {isRoomFeed ? 'Room' : 'Common Room'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              aria-label="Search"
              onClick={onOpenSearch}
              type="button"
              style={{ background: 'none', border: 'none', color: '#0b0b0b', cursor: 'pointer', padding: 4 }}
            >
              <Search size={18} strokeWidth={1.8} />
            </button>
            <button
              aria-label="Notifications"
              onClick={onOpenNotifications}
              type="button"
              style={{ background: 'none', border: 'none', color: '#0b0b0b', cursor: 'pointer', padding: 4, position: 'relative' }}
            >
              <Bell size={18} strokeWidth={1.8} />
              {hasUnreadNotifications ? (
                <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: '#b3261e' }} />
              ) : null}
            </button>
          </div>
        </CRHeader>

        {!isOnline ? (
          <Banner className="room-offline-banner" variant="info">
            You’re offline. {posts.length ? 'Showing what you saw last.' : 'Check your connection and try again.'}
          </Banner>
        ) : null}

        {/* Skeleton Loading State */}
        {loading ? (
          <div className="room-skeleton-feed" aria-label="Loading moments">
            {[1, 2].map((k) => (
              <div className="room-skeleton-card" key={k}>
                <div className="room-skeleton-header">
                  <Skeleton className="room-skeleton-avatar" />
                  <div className="room-skeleton-col">
                    <Skeleton className="room-skeleton-line short" />
                    <Skeleton className="room-skeleton-line tiny" />
                  </div>
                </div>
                <Skeleton className="room-skeleton-media" />
                <div className="room-skeleton-footer">
                  <Skeleton className="room-skeleton-line medium" />
                  <Skeleton className="room-skeleton-line full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && displayedPosts.length === 0 && feedError && feedErrorSource !== 'more' ? (
          <ErrorState
            className="room-feed-state"
            description="Check your connection and try again."
            icon={<CircleAlert size={20} />}
            onRetry={() => void loadFeed()}
            title="Couldn’t load your feed"
          />
        ) : null}
        {!loading && !loadingMore && !hasMore && displayedPosts.length === 0 && !feedError ? (
          <EmptyState
            action={(
              <div className="room-empty-actions">
                <Button onClick={isGuest ? onRequireAccount : onOpenProfile} variant="ghost">
                  Pick interests
                </Button>
                <Button onClick={isGuest ? onRequireAccount : onOpenSearch} variant="pill">
                  Find people
                </Button>
              </div>
            )}
            className="room-feed-state"
            description={isGuest ? 'Sign in to follow people and fill your feed.' : 'Follow people or pick interests to fill your feed.'}
            icon={<Users size={20} />}
            title="Nothing here yet"
          />
        ) : null}

        {/* Normal vertical card scroll matching Sprint 7 and Screens 3 & 4 */}
        {!loading && displayedPosts.length > 0 ? (
          <div className="room-vertical-feed" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {displayedPosts.map((post) => {
              const items = postMedia(post);
              const itemIndex = Math.min(mediaIndex[post.id] ?? 0, Math.max(0, items.length - 1));
              const currentMedia = items[itemIndex] ?? null;

              return (
                <article
                  key={post.id}
                  className="room-post-card"
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#ffffff',
                  }}
                >
                  {/* Header: Author + Time + Options */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <button
                      className="room-author-btn"
                      onClick={() => void showProfile(post.authorId)}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        className="a36 s"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: '#0b0b0b',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {post.authorAvatar ? (
                          <img alt={post.authorName} height={34} src={post.authorAvatar} width={34} style={{ objectFit: 'cover' }} />
                        ) : (
                          <span>{initials(post.authorName)}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0b0b0b', lineHeight: 1.3 }}>
                          {post.authorName}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6b6b6b' }}>
                          @{post.authorUsername} · {post.time}
                        </div>
                      </div>
                    </button>

                    <button
                      aria-label="Post options"
                      onClick={() => setMenuPostId(post.id)}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b6b6b',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                      }}
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>

                  {/* Caption */}
                  {post.caption ? (
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: '#0b0b0b',
                        margin: '6px 0 8px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {renderWithMentions(post.caption, showProfileByUsername)}
                    </p>
                  ) : null}

                  {/* Hashtags */}
                  {post.tags && post.tags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {post.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: 11.5, color: '#6b6b6b' }}>
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Location badge if any */}
                  {post.location ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11.5,
                        color: '#6b6b6b',
                        background: '#f7f7f7',
                        padding: '3px 8px',
                        borderRadius: 8,
                        marginBottom: 10,
                      }}
                    >
                      <MapPin size={11} />
                      <span>{post.location}</span>
                    </div>
                  ) : null}

                  {/* Media Content (Photo or Video) */}
                  {currentMedia ? (
                    <div
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        background: '#0b0b0b',
                        marginBottom: 10,
                        maxHeight: 460,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {currentMedia.mediaType === 'video' ? (
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          src={currentMedia.uri}
                          style={{
                            width: '100%',
                            maxHeight: 460,
                            display: 'block',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <img
                          alt=""
                          src={currentMedia.uri}
                          style={{
                            width: '100%',
                            maxHeight: 460,
                            display: 'block',
                            objectFit: 'contain',
                          }}
                        />
                      )}
                    </div>
                  ) : null}

                  {/* Poll if any */}
                  {post.pollOptions && post.pollOptions.length > 0 ? (
                    <div
                      style={{
                        background: '#f8f8f8',
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 10,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          color: '#6b6b6b',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Poll</span>
                        <span>
                          {post.totalPollVotes ?? post.pollVotes?.reduce((a, b) => a + b, 0) ?? 0} votes
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
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
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: 10,
                                border: '1px solid #e5e5e5',
                                background: isSelected ? '#0b0b0b' : '#fff',
                                color: isSelected ? '#fff' : '#0b0b0b',
                                fontSize: 12.5,
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                width: '100%',
                                textAlign: 'left',
                              }}
                            >
                              {hasVoted ? (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    width: `${pct}%`,
                                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                                    pointerEvents: 'none',
                                  }}
                                />
                              ) : null}
                              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isSelected ? <Check size={12} strokeWidth={2.5} /> : null}
                                <span>{option}</span>
                              </span>
                              {hasVoted ? (
                                <span style={{ position: 'relative', zIndex: 1, fontSize: 11, opacity: 0.8 }}>
                                  {pct}%
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Actions Footer: Likes, Comments, Share */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      paddingTop: 4,
                      fontSize: 12,
                      color: '#6b6b6b',
                    }}
                  >
                    <button
                      aria-label="Like post"
                      onClick={() => void toggleLike(post)}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'none',
                        border: 'none',
                        color: post.liked ? '#ef4444' : '#6b6b6b',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      <Heart size={16} fill={post.liked ? '#ef4444' : 'none'} />
                      <span>{formatCount(post.likes)}</span>
                    </button>
                    <button
                      aria-label="Open comments"
                      onClick={() => openComments(post.id)}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'none',
                        border: 'none',
                        color: '#6b6b6b',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>{formatCount(post.comments)}</span>
                    </button>
                    <button
                      aria-label="Share post"
                      onClick={() => void sharePost(post)}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'none',
                        border: 'none',
                        color: '#6b6b6b',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                        marginLeft: 'auto',
                      }}
                    >
                      <Send size={15} />
                      <span>Share</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        {!loading && hasMore ? (
          <div aria-hidden="true" className="room-load-more-marker" ref={loadMoreMarkerRef} />
        ) : null}
        {loadingMore ? (
          <div className="room-load-more-status" role="status">
            <Skeleton style={{ width: 18, height: 18 }} />
            <span>Loading more posts…</span>
          </div>
        ) : null}
        {!loading && feedError && (displayedPosts.length > 0 || feedErrorSource === 'more') ? (
          <ErrorState
            className="room-feed-more-error"
            description="Check your connection and try again."
            onRetry={() => void (feedErrorSource === 'more' ? loadMore() : loadFeed())}
            title={feedErrorSource === 'more' ? 'Couldn’t load more posts' : 'Couldn’t refresh your feed'}
          />
        ) : null}
        {!isOnline && posts.length > 0 ? (
          <div className="room-offline-retry">
            <Button onClick={() => void loadFeed()} variant="ghost">Retry</Button>
          </div>
        ) : null}
        {!isRoomFeed && !loading && displayedPosts.length > 0 ? (
          <button aria-label="Create a post" className="room-home-create" onClick={onCreate} type="button">
            <Plus size={22} />
          </button>
        ) : null}
      </div>

      {/* =========================================================================
          SLIDE-OVER COMMENTS SHEET (Matches mobile RoomCommentsSheet)
          ========================================================================= */}
      {commentsOpen && activePost ? (
        <div className="room-comments-backdrop" onClick={() => setCommentsOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="room-comments-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Comments" style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '12px 16px 16px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 540, margin: '0 auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>
            <div className="grab" style={{ width: 36, height: 4, borderRadius: 4, background: '#d4d4d4', margin: '0 auto 12px' }} />
            <div className="sp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="sh" style={{ fontSize: 14, fontWeight: 500, color: '#0b0b0b' }}>
                Comments · {activePost.comments}
              </span>
              <button
                aria-label="Close comments"
                onClick={() => setCommentsOpen(null)}
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0b0b0b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable comments list */}
            <div className="room-comments-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 120, paddingBottom: 10 }}>
              {(() => {
                const thread = comments[activePost.id] ?? [];
                const roots = thread.filter((c) => !c.parent_id);
                const repliesFor = (id: string) => thread.filter((c) => c.parent_id === id);

                if (roots.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6b6b6b', fontSize: 13 }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#0b0b0b' }}>No comments yet</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12 }}>Be the first to join the conversation.</p>
                    </div>
                  );
                }

                return roots.map((comment) => (
                  <div key={comment.id} style={{ marginBottom: 12 }}>
                    <div className="cm" style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.4 }}>
                      <div className="a36 s" style={{ width: 28, height: 28, borderRadius: '50%', background: '#9e9e9e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                        {initials(comment.author_name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div>
                          <b style={{ fontWeight: 500, color: '#0b0b0b' }}>{comment.author_name}</b>{' '}
                          <span className="m" style={{ color: '#6b6b6b', fontSize: 11.5 }}>@{comment.author_username}</span>
                        </div>
                        <div style={{ color: '#0b0b0b', marginTop: 2 }}>{renderWithMentions(comment.body, showProfileByUsername)}</div>
                        <div className="act" style={{ display: 'flex', gap: 14, color: '#6b6b6b', fontSize: 11.5, marginTop: 4, alignItems: 'center' }}>
                          <button
                            aria-label="Like comment"
                            onClick={() => toggleCommentLike(comment.id)}
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, color: commentLikes[comment.id] ? '#b3261e' : 'inherit', fontSize: 'inherit' }}
                          >
                            <Heart
                              color={commentLikes[comment.id] ? '#b3261e' : 'currentColor'}
                              fill={commentLikes[comment.id] ? '#b3261e' : 'none'}
                              size={12}
                            />
                            {commentLikes[comment.id] ? <span>1</span> : null}
                          </button>
                          <button
                            onClick={() => {
                              setReplyTo((cur) => ({ ...cur, [activePost.id]: comment }));
                              setCommentDrafts((cur) => ({ ...cur, [activePost.id]: `@${comment.author_username} ` }));
                            }}
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 'inherit' }}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Child replies */}
                    {repliesFor(comment.id).map((reply) => (
                      <div key={reply.id} className="cm r" style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.4, marginLeft: 38, marginTop: 8 }}>
                        <div className="a36 s" style={{ width: 24, height: 24, borderRadius: '50%', background: '#b0bec5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                          {initials(reply.author_name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div>
                            <b style={{ fontWeight: 500, color: '#0b0b0b' }}>{reply.author_name}</b>{' '}
                            <span className="m" style={{ color: '#6b6b6b', fontSize: 11.5 }}>@{reply.author_username}</span>
                          </div>
                          <div style={{ color: '#0b0b0b', marginTop: 2 }}>{renderWithMentions(reply.body, showProfileByUsername)}</div>
                          <div className="act" style={{ display: 'flex', gap: 14, color: '#6b6b6b', fontSize: 11.5, marginTop: 4, alignItems: 'center' }}>
                            <button
                              aria-label="Like reply"
                              onClick={() => toggleCommentLike(reply.id)}
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, color: commentLikes[reply.id] ? '#b3261e' : 'currentColor', fontSize: 'inherit' }}
                            >
                              <Heart
                                color={commentLikes[reply.id] ? '#b3261e' : 'currentColor'}
                                fill={commentLikes[reply.id] ? '#b3261e' : 'none'}
                                size={12}
                              />
                              {commentLikes[reply.id] ? <span>1</span> : null}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f5f5f5', borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
                <span>Replying to <strong>@{replyTo[activePost.id]?.author_username}</strong></span>
                <button
                  onClick={() => setReplyTo((cur) => ({ ...cur, [activePost.id]: null }))}
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b3261e', fontSize: 11 }}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {/* Mention Autocomplete Menu */}
            {mentionSuggestions.length > 0 ? (
              <div className="mention-autocomplete-menu" role="listbox" style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 4, marginBottom: 6, maxHeight: 140, overflowY: 'auto' }}>
                {mentionSuggestions.map((user) => (
                  <button
                    key={user.id}
                    className="mention-autocomplete-item"
                    onClick={() => insertMention(activePost.id, user.username)}
                    type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0b0b0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                      {user.avatar ? <img alt={user.name} src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : initials(user.name)}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <strong style={{ fontWeight: 500 }}>{user.name}</strong> <span style={{ color: '#6b6b6b' }}>@{user.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Comment Form */}
            <form onSubmit={(e) => void submitComment(e, activePost.id)} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10, borderTop: '1px solid #ececec' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0b0b0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
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
                placeholder={replyTo[activePost.id] ? `Reply to @${replyTo[activePost.id]?.author_username}…` : 'Add a comment…'}
                value={commentDrafts[activePost.id] ?? ''}
                style={{ flex: 1, height: 36, borderRadius: 999, border: '1px solid #d4d4d4', padding: '0 12px', fontSize: 12.5, outline: 'none' }}
              />
              <button
                aria-label="Send comment"
                disabled={!(commentDrafts[activePost.id] ?? '').trim()}
                type="submit"
                style={{ width: 34, height: 34, borderRadius: '50%', background: (commentDrafts[activePost.id] ?? '').trim() ? '#0b0b0b' : '#e0e0e0', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (commentDrafts[activePost.id] ?? '').trim() ? 'pointer' : 'default', flexShrink: 0 }}
              >
                <Send size={15} />
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
        const reelList = videoPosts.length > 0 ? videoPosts : displayedPosts;
        const currentReelIndex = Math.max(0, reelList.findIndex((p) => p.id === currentReelPost.id));

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
              reelTouchStartY.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
              const start = reelTouchStartY.current;
              reelTouchStartY.current = null;
              const end = e.changedTouches[0]?.clientY;
              if (start !== null && end !== undefined && Math.abs(start - end) > 35) {
                if (start > end) {
                  goNextReel(); // Swipe up for next reel (TikTok / Instagram standard)
                } else {
                  goPrevReel(); // Swipe down for previous reel
                }
              }
              setReelViewerOffset(0);
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
                    alt=""
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
                  <img alt="" src={viewedItem.uri} />
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
