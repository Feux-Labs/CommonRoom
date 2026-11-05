'use client';

import { ArrowLeft, Check, CircleHelp, Clock3, Copy, Heart, Link2, LockKeyhole, MessageCircle, MessagesSquare, Pencil, Quote, Send, Share2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { Button, EmptyState, ErrorState, Header, ListRow, Sheet, Skeleton, Toggle } from '@/components/cr/primitives';

type Scope = 'school' | 'all_nigerian_schools';
type FeedSort = 'new' | 'hot' | 'trending' | 'for_you';
type FeedTab = 'for_you' | 'general' | 'hot' | 'trending';
type MeTab = 'try_these' | 'inbox' | 'link_settings';
const inboxTemplates = [
  { id: 'confession', title: 'Confessions', prompt: 'Send me an anonymous confession 👀', colors: ['#31a9ed', '#6844ed'] },
  { id: 'crush', title: 'Your crush', prompt: 'Tell me who your crush is, anonymously 🤫', colors: ['#f04c88', '#ad38d2'] },
  { id: 'three-words', title: 'Three words', prompt: 'Describe me in 3 words — anonymously', colors: ['#ec3158', '#a91748'] },
  { id: 'never-have', title: 'Never have I ever', prompt: 'Send me a never-have-I-ever 👀', colors: ['#7128d7', '#451178'] },
  { id: 'tbh', title: 'Real talk', prompt: 'Give me your honest take — no names attached', colors: ['#f04b74', '#ef78c5'] },
  { id: 'custom', title: 'Your own question', prompt: 'Ask me anything anonymously…', colors: ['#2663d9', '#13295c'] },
] as const;
const templateIllustrations = {
  confession: MessageCircle,
  crush: Heart,
  'three-words': Quote,
  'never-have': CircleHelp,
  tbh: MessagesSquare,
  custom: CircleHelp,
};

const anonCardThemes = [
  { id: 'blue-hour', label: 'Blue Hour', bg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' },
  { id: 'soft-sky', label: 'Soft Sky', bg: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  { id: 'warm-glow', label: 'Warm Glow', bg: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  { id: 'rose-note', label: 'Rose Note', bg: 'linear-gradient(135deg, #be185d, #ec4899)' },
] as const;

const quickPrompts = [
  { label: 'Campus Confession 👀', prompt: 'I need to get this off my chest: ' },
  { label: 'Secret Crush 🤫', prompt: 'To the student sitting in my lecture: ' },
  { label: 'Unpopular Opinion 🔥', prompt: 'Unpopular opinion about our campus: ' },
  { label: 'Exam Stress 📚', prompt: 'Honestly, this semester is ' },
  { label: 'Real Talk 💬', prompt: 'Can we talk about what happened today? ' },
];
type Identity = { handle: string; created_at: string };
type MediaItem = { path: string; mediaType: 'photo' | 'video' };
type Post = {
  id: string;
  scope: Scope;
  school: string | null;
  title: string;
  body: string;
  author_handle: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  created_at: string;
  media_items?: MediaItem[];
  card_theme?: string;
};
type PostPage = { posts: Post[]; hasMore: boolean; nextCursor: string | null };
type Comment = { id: string; parent_comment_id: string | null; author_handle: string; body: string; created_at: string };
type InboxLink = { token: string; enabled: boolean };
type Thread = { id: string; last_message: string | null; last_message_at: string | null; message_count: number };
type InboxMessage = { id: string; body: string; is_mine: boolean; participant_label: 'Anonymous'; created_at: string };
type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { code?: string; message?: string } };
type PublicMessageState = 'loading' | 'ready' | 'sending' | 'sent' | 'rate_limited' | 'off' | 'invalid' | 'error';

class AnonymousApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'AnonymousApiError';
  }
}

function rankPosts(posts: Post[], sort: FeedSort) {
  if (sort === 'new') return posts;
  return [...posts].sort((left, right) => {
    const leftAgeHours = Math.max(1, (Date.now() - new Date(left.created_at).getTime()) / 3_600_000);
    const rightAgeHours = Math.max(1, (Date.now() - new Date(right.created_at).getTime()) / 3_600_000);
    const leftEngagement = left.likes_count + left.comments_count * 2;
    const rightEngagement = right.likes_count + right.comments_count * 2;
    const leftScore = sort === 'hot' ? leftEngagement : leftEngagement / Math.pow(leftAgeHours + 2, 0.8);
    const rightScore = sort === 'hot' ? rightEngagement : rightEngagement / Math.pow(rightAgeHours + 2, 0.8);
    return rightScore - leftScore;
  });
}

function uniquePostsById(posts: Post[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

function apiPath(path: string) {
  return `/api/v1/anonymous${path}`;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function textCardTheme(id: string, theme?: string) {
  const themeClasses: Record<string, string> = {
    'blue-hour': 'anon-text-card-blue',
    'soft-sky': 'anon-text-card-sky',
    'warm-glow': 'anon-text-card-warm',
    'rose-note': 'anon-text-card-rose',
  };
  if (theme && themeClasses[theme]) return themeClasses[theme];
  const hash = Array.from(id).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return `anon-text-card-${hash % 4}`;
}

function resolveAnonMediaUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return getBrowserSupabase().storage.from('post-media').getPublicUrl(path).data.publicUrl;
}

export function AnonymousExperience({
  initialInboxToken,
  initialPostId,
  initialSession,
  onBack,
  onCreateAnonymous,
  onRequireAccount,
}: {
  initialInboxToken?: string;
  initialPostId?: string;
  initialSession?: Session | null;
  onBack?: () => void;
  onCreateAnonymous?: () => void;
  onRequireAccount?: () => void;
}) {
  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [handleDraft, setHandleDraft] = useState('');
  const [identityPromptOpen, setIdentityPromptOpen] = useState(false);
  const [view, setView] = useState<'feed' | 'me'>(initialInboxToken ? 'me' : 'feed');
  const [meTab, setMeTab] = useState<MeTab>(initialInboxToken ? 'inbox' : 'try_these');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(inboxTemplates[0].id);
  const [templateText, setTemplateText] = useState<string>(inboxTemplates[0].prompt);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateTitles, setTemplateTitles] = useState<Record<string, string>>(() => Object.fromEntries(inboxTemplates.map((template) => [template.id, template.title])));
  const [editingTemplateTitleId, setEditingTemplateTitleId] = useState<string | null>(null);
  const templateTitleEditorRef = useRef<HTMLSpanElement | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTab>('for_you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [feedLoadError, setFeedLoadError] = useState('');
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, Comment | null>>({});
  const [reportTarget, setReportTarget] = useState<{ targetKind: 'post' | 'comment' | 'message'; targetId: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [link, setLink] = useState<InboxLink | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxLoadError, setInboxLoadError] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadOwner, setThreadOwner] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [publicMessageState, setPublicMessageState] = useState<PublicMessageState>('loading');
  const [publicPageError, setPublicPageError] = useState('');
  const [previewMessage, setPreviewMessage] = useState<InboxMessage | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null);
  const [videoViewer, setVideoViewer] = useState<{ posts: Post[]; index: number } | null>(null);
  const [pendingVideoViewer, setPendingVideoViewer] = useState<{ posts: Post[]; index: number } | null>(null);
  const [swipeTutorialOpen, setSwipeTutorialOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const feedSentinelRef = useRef<HTMLDivElement | null>(null);
  const feedGenerationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const viewerTouchStartRef = useRef<number | null>(null);
  const hasAccount = Boolean(session && !session.user.is_anonymous);
  const displayedPublicMessageState: PublicMessageState = initialInboxToken && ready && !session ? 'error' : publicMessageState;
  const displayedPublicPageError = initialInboxToken && ready && !session
    ? 'Couldn’t start a private anonymous session. Check your connection and try again.'
    : publicPageError;
  const scope: Scope = 'all_nigerian_schools';
  const feedSort: FeedSort = feedTab === 'for_you' ? 'for_you' : feedTab === 'hot' || feedTab === 'trending' ? feedTab : 'new';

  // Self-Contained Inline Create Modal
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTheme, setComposeTheme] = useState<'blue-hour' | 'soft-sky' | 'warm-glow' | 'rose-note'>('blue-hour');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const submitInlinePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!composeBody.trim()) {
      setError('Please add a message to your anonymous post.');
      return;
    }
    setIsSubmittingPost(true);
    setError('');
    try {
      const payload = {
        scope: 'all_nigerian_schools',
        title: composeTitle.trim() || 'Anonymous Note',
        body: composeBody.trim(),
        cardTheme: composeTheme,
      };

      let newPost: Post;
      if (hasAccount) {
        const created = await request<{ id: string }>('/posts', 'POST', payload);
        newPost = {
          id: created.id,
          scope: 'all_nigerian_schools',
          school: identity?.handle ? 'Campus Student' : null,
          title: payload.title,
          body: payload.body,
          author_handle: identity?.handle || 'Anonymous',
          likes_count: 0,
          comments_count: 0,
          liked_by_me: false,
          is_mine: true,
          created_at: new Date().toISOString(),
          card_theme: composeTheme,
        };
      } else {
        newPost = {
          id: `anon-${Date.now()}`,
          scope: 'all_nigerian_schools',
          school: 'Campus Student',
          title: payload.title,
          body: payload.body,
          author_handle: 'Anonymous',
          likes_count: 1,
          comments_count: 0,
          liked_by_me: true,
          is_mine: true,
          created_at: new Date().toISOString(),
          card_theme: composeTheme,
        };
      }

      setPosts((cur) => [newPost, ...cur]);
      setComposeBody('');
      setComposeTitle('');
      setInlineCreateOpen(false);
      setNotice('Your anonymous post is live in the feed!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish anonymous post.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  useEffect(() => {
    if (editingTemplateTitleId) templateTitleEditorRef.current?.focus();
  }, [editingTemplateTitleId]);

  const request = useCallback(async <T,>(path: string, method = 'GET', payload?: unknown): Promise<T> => {
    if (!session && method !== 'GET') {
      onRequireAccount?.();
      throw new Error('Sign in to interact with Anonymous posts.');
    }
    if (!session) {
      const response = await fetch(apiPath(path), {
        method,
        headers: { Accept: 'application/json' },
      });
      const result = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
      if (!response.ok) {
        const failure = result as ApiFailure | null;
        throw new AnonymousApiError(failure?.error?.message ?? `Request failed with status ${response.status}.`, response.status, failure?.error?.code);
      }
      if (!result || !('data' in result)) throw new Error('The Anonymous service returned an invalid response.');
      return result.data;
    }
    const response = await fetch(apiPath(path), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `******`,
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null) as ApiEnvelope<T> | ApiFailure | null;
    if (!response.ok) {
      const failure = result as ApiFailure | null;
      throw new AnonymousApiError(failure?.error?.message ?? `Request failed with status ${response.status}.`, response.status, failure?.error?.code);
    }
    if (!result || !('data' in result)) throw new Error('The Anonymous service returned an invalid response.');
    return result.data;
  }, [onRequireAccount, session]);

  const loadIdentity = useCallback(async () => {
    if (!session || (!hasAccount && !initialInboxToken)) {
      setIdentity(null);
      setIdentityPromptOpen(false);
      setHandleDraft((current) => current || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
      return null;
    }
    try {
      const result = await request<Identity | null>('/identity');
      if (result) {
        setIdentity(result);
        setHandleDraft(result.handle);
        if (typeof window !== 'undefined') {
          localStorage.setItem('anonymous_handle', result.handle);
        }
        return result;
      }
    } catch (identityError) {
      setIdentity(null);
      setError(identityError instanceof Error ? identityError.message : 'Your Anonymous identity could not be loaded.');
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('anonymous_handle') : null;
    const fallbackHandle = stored || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`;
    setHandleDraft(fallbackHandle);
    setIdentityPromptOpen(true);
    return null;
  }, [hasAccount, initialInboxToken, request, session]);

  const loadPosts = useCallback(async () => {
    const generation = ++feedGenerationRef.current;
    loadingMoreRef.current = false;
    setIsLoadingMorePosts(false);
    setIsLoadingPosts(true);
    setFeedLoadError('');
    setError('');
    setHasMorePosts(false);
    setNextCursor(null);
    setPosts([]);
    if (initialPostId) {
      try {
        const posts = await request<Post[]>(`/posts?scope=all_nigerian_schools&id=${initialPostId}`);
        if (generation === feedGenerationRef.current) setPosts(posts);
      } catch (loadError) {
        if (generation === feedGenerationRef.current) {
          setFeedLoadError(loadError instanceof Error ? loadError.message : 'The Anonymous Feed could not be loaded.');
        }
      } finally {
        if (generation === feedGenerationRef.current) setIsLoadingPosts(false);
      }
      return;
    }
    try {
      const result = await request<PostPage>(`/posts?scope=${scope}&page=1`);
      if (generation === feedGenerationRef.current) {
        setPosts(uniquePostsById(result.posts));
        setHasMorePosts(result.hasMore && result.nextCursor !== null);
        setNextCursor(result.nextCursor);
      }
    } catch (loadError) {
      if (generation === feedGenerationRef.current) {
        setFeedLoadError(loadError instanceof Error ? loadError.message : 'The Anonymous Feed could not be loaded.');
      }
    } finally {
      if (generation === feedGenerationRef.current) setIsLoadingPosts(false);
    }
  }, [initialPostId, request, scope]);

  const loadMorePosts = useCallback(async () => {
    if (!nextCursor || !hasMorePosts || loadingMoreRef.current || initialPostId) return;
    const generation = feedGenerationRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMorePosts(true);
    setFeedLoadError('');
    try {
      const result = await request<PostPage>(`/posts?scope=${scope}&page=1&cursor=${encodeURIComponent(nextCursor)}`);
      if (generation !== feedGenerationRef.current) return;
      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post.id));
        const newPosts = result.posts.filter((post) => {
          if (existingIds.has(post.id)) return false;
          existingIds.add(post.id);
          return true;
        });
        return [...current, ...newPosts];
      });
      setHasMorePosts(result.hasMore && result.nextCursor !== null);
      setNextCursor(result.nextCursor);
    } catch (loadError) {
      if (generation === feedGenerationRef.current) {
        setFeedLoadError(loadError instanceof Error ? loadError.message : 'More posts could not be loaded.');
      }
    } finally {
      if (generation === feedGenerationRef.current) {
        loadingMoreRef.current = false;
        setIsLoadingMorePosts(false);
      }
    }
  }, [hasMorePosts, initialPostId, nextCursor, request, scope]);

  const loadInbox = useCallback(async () => {
    setIsLoadingInbox(true);
    setInboxLoadError('');
    try {
      const [currentLink, currentThreads] = await Promise.all([
        request<InboxLink | null>('/inbox/link'),
        request<Thread[]>('/inbox'),
      ]);
      setLink(currentLink);
      setThreads(currentThreads);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Your Inbox could not be loaded.';
      setInboxLoadError(message);
      throw loadError;
    } finally {
      setIsLoadingInbox(false);
    }
  }, [request]);

  const loadMessages = useCallback(async (id: string) => {
    setIsLoadingMessages(true);
    try {
      const result = await request<InboxMessage[]>(`/inbox/threads/${id}`);
      setMessages(result);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [request]);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      setReady(true);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const supabase = getBrowserSupabase();
        const current = await supabase.auth.getSession();
        let activeSession = current.data.session;
        if (!activeSession) {
          const guest = await supabase.auth.signInAnonymously();
          if (!guest.error && guest.data.session) {
            activeSession = guest.data.session;
          }
        }
        if (!active) return;
        if (activeSession) {
          setSession(activeSession);
        }
        setReady(true);
      } catch {
        if (active) {
          setHandleDraft((current) => current || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
          setReady(true);
        }
      }
    })();
    return () => { active = false; };
  }, [initialSession]);

  useEffect(() => {
    if (!hasAccount) return;
    void loadIdentity().catch(() => {
      // Handled inside loadIdentity with local fallback
    });
  }, [hasAccount, loadIdentity]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const sentinel = feedSentinelRef.current;
    if (!sentinel || !hasMorePosts || isLoadingMorePosts || feedLoadError || initialPostId) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMorePosts();
    }, { rootMargin: '400px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feedLoadError, hasMorePosts, initialPostId, isLoadingMorePosts, loadMorePosts]);

  useEffect(() => {
    if (!hasAccount || view !== 'me' || initialInboxToken) return;
    void loadInbox().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Your Inbox could not be loaded.'));
  }, [hasAccount, initialInboxToken, loadInbox, view]);

  const fetchPublicPrompt = useCallback(() => {
    if (!initialInboxToken) return Promise.reject(new Error('This anonymous link could not be opened.'));
    return request<{ enabled: boolean }>(`/inbox/links/${initialInboxToken}`);
  }, [initialInboxToken, request]);

  const handlePublicPrompt = useCallback((prompt: { enabled: boolean }) => {
    setPublicPageError('');
    setPublicMessageState(prompt.enabled ? 'ready' : 'off');
  }, []);

  const handlePublicPromptError = useCallback((promptError: unknown) => {
    setPublicMessageState(promptError instanceof AnonymousApiError && promptError.status === 404 ? 'invalid' : 'error');
    setPublicPageError(promptError instanceof Error ? promptError.message : 'This anonymous link could not be opened.');
  }, []);

  function retryPublicPrompt() {
    setPublicMessageState('loading');
    setPublicPageError('');
    void fetchPublicPrompt().then(handlePublicPrompt, handlePublicPromptError);
  }

  useEffect(() => {
    if (!initialInboxToken || !session) return;
    void fetchPublicPrompt().then(handlePublicPrompt, handlePublicPromptError);
  }, [fetchPublicPrompt, handlePublicPrompt, handlePublicPromptError, initialInboxToken, session]);

  const rankedPosts = useMemo(() => rankPosts(posts, feedSort), [feedSort, posts]);
  const videoPosts = useMemo(() => rankedPosts.filter((post) => post.media_items?.some((item) => item.mediaType === 'video')), [rankedPosts]);

  const openVideoViewer = (post: Post) => {
    const index = videoPosts.findIndex((videoPost) => videoPost.id === post.id);
    if (index < 0) return;
    const next = { posts: videoPosts, index };
    if (window.localStorage.getItem('anonymous_video_swipe_tutorial_seen') !== 'true') {
      setPendingVideoViewer(next);
      setSwipeTutorialOpen(true);
      return;
    }
    setVideoViewer(next);
  };

  const showVideoViewer = () => {
    window.localStorage.setItem('anonymous_video_swipe_tutorial_seen', 'true');
    setVideoViewer(pendingVideoViewer);
    setPendingVideoViewer(null);
    setSwipeTutorialOpen(false);
  };

  const stepVideoViewer = (direction: -1 | 1) => {
    setVideoViewer((current) => current
      ? { ...current, index: Math.max(0, Math.min(current.posts.length - 1, current.index + direction)) }
      : current);
  };

  useEffect(() => {
    if (!imagePreview && !videoViewer && !swipeTutorialOpen && !openComments && !shareTarget && !reportTarget && !previewMessage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagePreview(null);
        setVideoViewer(null);
        setSwipeTutorialOpen(false);
        setOpenComments(null);
        setShareTarget(null);
        setReportTarget(null);
        setPreviewMessage(null);
      } else if (event.key === 'ArrowDown') {
        setVideoViewer((current) => current
          ? { ...current, index: Math.min(current.posts.length - 1, current.index + 1) }
          : current);
      } else if (event.key === 'ArrowUp') {
        setVideoViewer((current) => current
          ? { ...current, index: Math.max(0, current.index - 1) }
          : current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imagePreview, openComments, previewMessage, reportTarget, shareTarget, swipeTutorialOpen, videoViewer]);

  async function createIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || (!hasAccount && !initialInboxToken)) {
      onRequireAccount?.();
      return;
    }
    setBusy(true);
    setError('');
    const chosenHandle = handleDraft.trim() || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const result = await request<Identity>('/identity', 'POST', { handle: chosenHandle });
      setIdentity(result);
      if (typeof window !== 'undefined') {
        localStorage.setItem('anonymous_handle', result.handle);
      }
      setIdentityPromptOpen(false);
      setNotice(`You’re in as ${result.handle}.`);
    } catch (identityError) {
      if (initialInboxToken) {
        setError(identityError instanceof Error ? identityError.message : 'Your Anonymous name could not be saved.');
        return;
      }
      const localIdentity: Identity = {
        handle: chosenHandle,
        created_at: new Date().toISOString(),
      };
      setIdentity(localIdentity);
      if (typeof window !== 'undefined') {
        localStorage.setItem('anonymous_handle', chosenHandle);
      }
      setIdentityPromptOpen(false);
      setNotice(`You’re in as ${chosenHandle}.`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(post: Post) {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    if (!identity) {
      setNotice('Choose your Anonymous name to react.');
      return;
    }
    try {
      const result = await request<{ liked: boolean; likes_count: number }>(`/posts/${post.id}/like`, 'POST');
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, liked_by_me: result.liked, likes_count: result.likes_count }
        : item));
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Your reaction could not be saved.');
    }
  }

  async function toggleComments(postId: string) {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    setLoadingCommentsFor(postId);
    try {
      const result = await request<Comment[]>(`/posts/${postId}/comments`);
      setComments((current) => ({ ...current, [postId]: result }));
    } catch (commentError) {
      setOpenComments(null);
      setError(commentError instanceof Error ? commentError.message : 'Comments could not be loaded.');
    } finally {
      setLoadingCommentsFor(null);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    const value = commentDrafts[postId]?.trim();
    if (!value || !identity) {
      if (!identity) setNotice('Choose your Anonymous name to comment.');
      return;
    }
    try {
      const parentCommentId = replyTargets[postId]?.id ?? null;
      const comment = await request<Comment>(`/posts/${postId}/comments`, 'POST', { body: value, parentCommentId });
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setReplyTargets((current) => ({ ...current, [postId]: null }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post));
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Your comment could not be posted.');
    }
  }

  function report(targetKind: 'post' | 'comment' | 'message', targetId: string) {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    setReportTarget({ targetKind, targetId });
    setReportReason('');
    setReportDetails('');
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportTarget || !reportReason) return;
    setIsSubmittingReport(true);
    try {
      const reason = reportDetails.trim() ? `${reportReason}: ${reportDetails.trim()}` : reportReason;
      await request('/reports', 'POST', { ...reportTarget, reason });
      setReportTarget(null);
      setNotice('Report sent for review.');
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Your report could not be sent.');
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function createLink() {
    if (!hasAccount) {
      onRequireAccount?.();
      return null;
    }
    if (!identity) {
      setIdentityPromptOpen(true);
      return null;
    }
    try {
      setBusy(true);
      const result = await request<InboxLink>('/inbox/link', 'POST');
      setLink(result);
      setNotice('Your anonymous link is ready.');
      return result;
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Your link could not be created.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function setLinkEnabled(enabled: boolean) {
    if (!link || busy) return;
    try {
      setBusy(true);
      setError('');
      const result = await request<{ enabled: boolean }>('/inbox/link', 'PATCH', { enabled });
      setLink((current) => current ? { ...current, enabled: result.enabled } : current);
      setNotice(result.enabled ? 'Your link is accepting messages.' : 'Your link is paused.');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Your link setting could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  async function retryInbox() {
    try {
      await loadInbox();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Your Inbox could not be loaded.');
    }
  }

  async function copyLink() {
    const readyLink = link ?? await createLink();
    if (!readyLink) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/anonymous/inbox/${readyLink.token}`);
      setNotice('Your link is copied. Share it anywhere.');
    } catch (clipboardError) {
      setError(clipboardError instanceof Error ? 'Clipboard access was denied. Copy the link shown above.' : 'The link could not be copied.');
    }
  }

  async function shareTemplate() {
    const readyLink = link ?? await createLink();
    if (!readyLink) return;
    const url = `${window.location.origin}/anonymous/inbox/${readyLink.token}`;
    const text = templateText.trim() || 'Send me an anonymous message';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Send me an anonymous message', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setNotice('Prompt and link copied. Paste them into your story.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError(shareError instanceof Error ? shareError.message : 'The share sheet could not be opened.');
    }
  }

  function selectTemplate(templateId: string) {
    const template = inboxTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(template.id);
    setTemplateText(template.prompt);
    setIsEditingTemplate(false);
  }

  async function openThread(id: string) {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    setThreadId(id);
    setThreadOwner(true);
    setPreviewMessage(null);
    setMessages([]);
    try {
      await loadMessages(id);
    } catch (threadError) {
      setError(threadError instanceof Error ? threadError.message : 'This private conversation could not be opened.');
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initialInboxToken && !hasAccount) {
      onRequireAccount?.();
      return;
    }
    if (!messageDraft.trim()) return;
    if (initialInboxToken && !session) {
      setPublicMessageState('error');
      setPublicPageError('Couldn’t start a private anonymous session. Check your connection and try again.');
      return;
    }
    if (!identity) {
      if (initialInboxToken) {
        await loadIdentity();
      } else {
        setNotice('Choose your Anonymous name before sending.');
      }
      return;
    }
    setBusy(true);
    setError('');
    if (initialInboxToken) {
      setPublicPageError('');
      setPublicMessageState('sending');
    }
    try {
      if (initialInboxToken && !threadId) {
        await request<{ thread_id: string }>(`/inbox/links/${initialInboxToken}/messages`, 'POST', { body: messageDraft });
        setMessageDraft('');
        setPublicMessageState('sent');
      } else if (threadId) {
        const result = await request<InboxMessage>(`/inbox/threads/${threadId}`, 'POST', { body: messageDraft });
        setMessages((current) => [...current, result]);
        setMessageDraft('');
      }
    } catch (sendError) {
      if (initialInboxToken) {
        if (sendError instanceof AnonymousApiError && sendError.status === 429) {
          setPublicMessageState('rate_limited');
        } else if (sendError instanceof AnonymousApiError && sendError.code === 'anonymous_inbox_link_unavailable') {
          setPublicMessageState('off');
        } else {
          setPublicMessageState('ready');
          setPublicPageError(sendError instanceof Error ? sendError.message : 'Your message could not be sent.');
        }
      } else {
        setError(sendError instanceof Error ? sendError.message : 'Your message could not be sent.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function blockThread() {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    if (!threadId || !window.confirm('Block this anonymous conversation?')) return;
    try {
      await request(`/inbox/threads/${threadId}/block`, 'POST');
      setThreadId(null);
      setMessages([]);
      setNotice('This conversation has been blocked.');
      await loadInbox();
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : 'This conversation could not be blocked.');
    }
  }

  async function confirmShare() {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    if (!threadId || !previewMessage || busy) return;
    try {
      setBusy(true);
      setError('');
      const created = await request<Post>(`/inbox/threads/${threadId}/share`, 'POST', {
        messageId: previewMessage.id,
        scope,
      });
      setPosts((current) => [created, ...current]);
      setPreviewMessage(null);
      setNotice('Only the selected message was published as a new Feed post.');
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'The message could not be shared.');
    } finally {
      setBusy(false);
    }
  }

  function sharePost(post: Post) {
    if (!hasAccount) {
      onRequireAccount?.();
      return;
    }
    setShareTarget(post);
  }

  async function copyPostLink() {
    if (!shareTarget) return;
    const url = `${window.location.origin}/anonymous/posts/${shareTarget.id}`;
    try {
      await navigator.clipboard.writeText(`${shareTarget.title}\n${url}`);
      setShareTarget(null);
      setNotice('Post link copied.');
    } catch (clipboardError) {
      setError(clipboardError instanceof Error ? clipboardError.message : 'The post link could not be copied.');
    }
  }

  async function sharePostWithDevice() {
    if (!shareTarget) return;
    const url = `${window.location.origin}/anonymous/posts/${shareTarget.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTarget.title, url });
        setShareTarget(null);
      } else {
        await copyPostLink();
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError(shareError instanceof Error ? shareError.message : 'The share sheet could not be opened.');
    }
  }

  async function deletePost(post: Post) {
    if (!window.confirm('Delete your anonymous post? This cannot be undone.')) return;
    try {
      await request(`/posts/${post.id}`, 'DELETE');
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Your post could not be deleted.');
    }
  }

  const personalLinkUrl = link ? `${typeof window === 'undefined' ? '' : window.location.origin}/anonymous/inbox/${link.token}` : '';
  const activeCommentsPost = openComments ? posts.find((post) => post.id === openComments) ?? null : null;
  const openComposer = () => {
    if (onCreateAnonymous) onCreateAnonymous();
    else setInlineCreateOpen(true);
  };

  if (!ready) return <main className="anon-shell"><p className="anon-loading">Opening Anonymous…</p></main>;

  return (
    <main className={initialInboxToken ? 'anon-shell cr-anon-public-shell' : 'anon-shell'}>
      <div className={initialInboxToken ? 'anon-wrap cr-anon-public-wrap' : 'anon-wrap'}>
        {initialInboxToken ? (
          <Header className="cr-anon-public-header">
            <div className="cr-anon-public-brand">
              <span aria-hidden="true" className="cr-anon-public-dots"><i /><i /><i /></span>
              <span>common room</span>
            </div>
          </Header>
        ) : (
          <header className="anon-topbar">
            <button
              type="button"
              className="anon-back-btn"
              aria-label="Back"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="anon-brand">
              <span className="anon-instagram-logo instagram-brand-font">Anonymous</span>
            </div>
          </header>
        )}

        {error && !error.toLowerCase().includes('sign in') ? <div className={`anon-feedback anon-error${initialInboxToken ? ' cr-anon-public-feedback' : ''}`} role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div> : null}
        {notice ? <div className="anon-feedback anon-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div> : null}

        {initialInboxToken ? (
          <section aria-label="Send anonymous message" className="cr-anon-public">
            {displayedPublicMessageState === 'loading' ? (
              <div aria-busy="true" className="cr-anon-public-loading">
                <Skeleton style={{ width: '100%', height: 190, borderRadius: 20 }} />
                <Skeleton style={{ width: 'calc(100% - 28px)', height: 210, borderRadius: 20, margin: '-32px 14px 0', position: 'relative' }} />
              </div>
            ) : displayedPublicMessageState === 'ready' || displayedPublicMessageState === 'sending' ? (
              <>
                <div className="cr-anon-public-hero">
                  <div aria-hidden="true" className="cr-anon-public-avatar"><ShieldCheck size={23} /></div>
                  <h1>Send an anonymous message</h1>
                  <p>They won’t see who you are. No account needed.</p>
                </div>
                <form className="cr-anon-public-card" onSubmit={(event) => void sendMessage(event)}>
                  {displayedPublicPageError ? <div className="cr-anon-public-banner" role="alert">Couldn’t send your message. Check your connection and try again. Your message is still here.</div> : null}
                  <label htmlFor="cr-anon-public-message">Your message</label>
                  <textarea
                    aria-label="Your message"
                    disabled={busy}
                    id="cr-anon-public-message"
                    maxLength={500}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Write something kind or honest…"
                    required
                    rows={5}
                    value={messageDraft}
                  />
                  <div className="cr-anon-public-count">
                    <span>Need a prompt?</span>
                    <span>{messageDraft.length} / 500</span>
                  </div>
                  <div className="cr-anon-public-submit">
                    <Button disabled={busy || !messageDraft.trim()} type="submit">
                      {busy ? <><span aria-hidden="true" className="cr-anon-public-spinner" />Sending…</> : displayedPublicPageError ? 'Try again' : 'Send anonymously'}
                    </Button>
                  </div>
                </form>
                <div className="cr-anon-public-privacy">
                  <LockKeyhole aria-hidden="true" size={16} />
                  <span>Your identity is never shared with the recipient. Messages are private, and the recipient chooses whether to share anything publicly.</span>
                </div>
              </>
            ) : displayedPublicMessageState === 'sent' ? (
              <div className="cr-anon-public-result">
                <div aria-hidden="true" className="cr-anon-public-result-icon"><Check size={25} /></div>
                <h1>Message sent</h1>
                <p>They won’t see who you are.</p>
                <div className="cr-anon-public-result-actions">
                  <Button onClick={() => { setMessageDraft(''); setPublicPageError(''); setPublicMessageState('ready'); }} variant="ghost">Send another</Button>
                  <a className="cr-anon-public-button" href="/anonymous">Get your own link</a>
                </div>
              </div>
            ) : displayedPublicMessageState === 'rate_limited' ? (
              <div className="cr-anon-public-result">
                <div aria-hidden="true" className="cr-anon-public-result-icon"><Clock3 size={25} /></div>
                <h1>Too many messages</h1>
                <p>You sent a few messages in a short time. Please try again later.</p>
                <div className="cr-anon-public-result-actions"><a className="cr-anon-public-button" href="/anonymous">Get your own link</a></div>
              </div>
            ) : displayedPublicMessageState === 'off' ? (
              <div className="cr-anon-public-result">
                <div aria-hidden="true" className="cr-anon-public-result-icon"><CircleHelp size={25} /></div>
                <h1>This link is turned off</h1>
                <p>This person isn’t taking anonymous messages right now. Try again later.</p>
                <div className="cr-anon-public-result-actions"><a className="cr-anon-public-button" href="/anonymous">Get your own link</a></div>
              </div>
            ) : displayedPublicMessageState === 'invalid' ? (
              <div className="cr-anon-public-result">
                <div aria-hidden="true" className="cr-anon-public-result-icon"><X size={25} /></div>
                <h1>This link isn’t valid</h1>
                <p>It may have been replaced or removed. Ask for a new link.</p>
                <div className="cr-anon-public-result-actions"><a className="cr-anon-public-button" href="/anonymous">Get your own link</a></div>
              </div>
            ) : (
              <div className="cr-anon-public-result">
                <div aria-hidden="true" className="cr-anon-public-result-icon"><CircleHelp size={25} /></div>
                <h1>Couldn’t open this link</h1>
                <p>{displayedPublicPageError || 'Check your connection and try again.'}</p>
                <div className="cr-anon-public-result-actions"><Button onClick={retryPublicPrompt} variant="ghost">Try again</Button></div>
              </div>
            )}
            <footer className="cr-anon-public-footer">
              <span aria-disabled="true" title="Reporting this link is not available here">Report abuse</span>
              <a href="/anonymous">Get your own link</a>
            </footer>
          </section>
        ) : (
          <>
            <nav aria-label="Anonymous views" className="anon-tabs">
              <button aria-current={view === 'feed' ? 'page' : undefined} className={view === 'feed' ? 'anon-tab anon-tab-active' : 'anon-tab'} onClick={() => setView('feed')}><MessageCircle size={16} /> Feed</button>
              <button aria-current={view === 'me' ? 'page' : undefined} className={view === 'me' ? 'anon-tab anon-tab-active' : 'anon-tab'} onClick={() => { if (!hasAccount) { onRequireAccount?.(); return; } setView('me'); setMeTab('try_these'); setThreadId(null); }}><ShieldCheck size={16} /> ME</button>
            </nav>

            {view === 'feed' ? (
              <div className="anon-content">
                <div className="anon-discovery-row">
                  <div className="anon-feed-tabs" role="tablist" aria-label="Anonymous Feed">
                    <button aria-selected={feedTab === 'for_you'} className={feedTab === 'for_you' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('for_you')} role="tab" title="Ranked using recent community activity">For You</button>
                    <button aria-selected={feedTab === 'general'} className={feedTab === 'general' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('general')} role="tab" title="All public anonymous posts in chronological order">General</button>
                    <button aria-selected={feedTab === 'hot'} className={feedTab === 'hot' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('hot')} role="tab">Hot</button>
                    <button aria-selected={feedTab === 'trending'} className={feedTab === 'trending' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('trending')} role="tab">Trending</button>
                  </div>
                </div>
                <button
                  className="anon-general-compose-entry"
                  onClick={openComposer}
                  type="button"
                >
                  <span className="anon-general-compose-avatar"><ShieldCheck size={16} /></span>
                  <span>Say what’s on your mind?</span>
                  <strong>Write anonymously</strong>
                </button>
                <div className="anon-feed">
                  {rankedPosts.length ? rankedPosts.map((post) => {
                    return (
                    <article className="anon-post" key={post.id}>
                      <div className="anon-post-top"><span className="anon-avatar"><ShieldCheck size={17} /></span><div><strong>{post.author_handle}</strong><small>General · {relativeTime(post.created_at)}</small></div>{hasAccount ? <button aria-label="Report post" className="anon-more" onClick={() => report('post', post.id)}>•••</button> : null}</div>
                      {post.media_items?.length ? (
                        <><h2>{post.title}</h2><p className="anon-post-body">{post.body}</p></>
                      ) : (
                        <div className={`anon-text-card ${textCardTheme(post.id, post.card_theme)}`}>
                          <h2>{post.title}</h2>
                          <p>{post.body}</p>
                        </div>
                      )}
                      {post.media_items?.length ? <div className="anon-post-media">
                        {post.media_items.map((item) => {
                          const mediaUrl = resolveAnonMediaUrl(item.path);
                          return item.mediaType === 'video'
                            ? <div className="anon-inline-video" key={item.path}>
                              <video controls preload="metadata" src={mediaUrl}>Your browser does not support video playback.</video>
                              <button className="anon-open-video-viewer" onClick={() => openVideoViewer(post)} type="button">Open vertical video viewer</button>
                            </div>
                            : <button
                              aria-label="View anonymous post image"
                              className="anon-image-preview-trigger"
                              key={item.path}
                              onClick={() => setImagePreview({ url: mediaUrl, alt: 'Anonymous post attachment' })}
                              type="button"
                            ><img alt="Anonymous post attachment" loading="lazy" src={mediaUrl} /></button>;
                        })}
                      </div> : null}
                      <div className="anon-post-actions">
                        <button aria-pressed={post.liked_by_me} onClick={() => void toggleLike(post)}><Heart size={16} fill={post.liked_by_me ? 'currentColor' : 'none'} /> {post.likes_count}</button>
                        <button onClick={() => void toggleComments(post.id)}><MessageCircle size={16} /> {post.comments_count}</button>
                        <button onClick={() => sharePost(post)}><Share2 size={16} /> Share</button>
                        {post.is_mine ? <button onClick={() => void deletePost(post)}>Delete</button> : null}
                      </div>
                    </article>
                    );
                  }) : isLoadingPosts ? <div aria-label="Loading Anonymous posts" aria-live="polite" className="cr-anon-loading">
                    {[0, 1, 2].map((item) => <article className="cr-anon-skeleton-card" key={item}><div><Skeleton style={{ width: 30, height: 30, borderRadius: '50%' }} /><Skeleton style={{ width: 100, height: 10 }} /></div><Skeleton style={{ width: '100%', height: 92, borderRadius: 12 }} /><div><Skeleton style={{ width: 58, height: 10 }} /><Skeleton style={{ width: 58, height: 10 }} /></div></article>)}
                  </div>
                    : feedLoadError ? <ErrorState className="cr-anon-feed-error" title="Couldn’t load the Anonymous feed" description={feedLoadError} onRetry={() => void loadPosts()} />
                      : <EmptyState className="cr-anon-empty" title="No posts yet" description="Be the first to post. Nobody will know it’s you." action={<Button onClick={openComposer}>Post anonymously</Button>} />}
                  {!initialPostId ? <div aria-hidden="true" className="anon-feed-sentinel" ref={feedSentinelRef} /> : null}
                  {isLoadingMorePosts ? <p aria-live="polite" className="anon-feed-status">Loading more conversations…</p> : null}
                  {feedLoadError && rankedPosts.length > 0 ? <ErrorState className="cr-anon-load-more-error" title="Couldn’t load more posts" description={feedLoadError} onRetry={() => void (nextCursor ? loadMorePosts() : loadPosts())} /> : null}
                  {!initialPostId && rankedPosts.length > 0 && !hasMorePosts && !isLoadingPosts
                    ? <p aria-live="polite" className="anon-feed-status">You’re all caught up.</p>
                    : null}
                </div>
              </div>
            ) : (
              <section className="anon-content anon-inbox-content">
                <nav aria-label="ME sections" className="anon-me-tabs" role="tablist">
                  <button aria-selected={meTab === 'try_these'} className={meTab === 'try_these' ? 'anon-me-tab anon-me-tab-active' : 'anon-me-tab'} onClick={() => setMeTab('try_these')} role="tab">Try these</button>
                  <button aria-selected={meTab === 'inbox'} className={meTab === 'inbox' ? 'anon-me-tab anon-me-tab-active' : 'anon-me-tab'} onClick={() => { setMeTab('inbox'); setThreadId(null); }} role="tab">Inbox</button>
                  <button aria-selected={meTab === 'link_settings'} className={meTab === 'link_settings' ? 'anon-me-tab anon-me-tab-active' : 'anon-me-tab'} onClick={() => setMeTab('link_settings')} role="tab">Link settings</button>
                </nav>
                {meTab === 'try_these' ? (
                  <div className="anon-try-these">
                    <div aria-label="Message prompt templates" className="anon-template-rail" role="list">
                      {inboxTemplates.map((template) => (
                        <article aria-label={`${template.title} template`} className={selectedTemplateId === template.id ? 'anon-template anon-template-selected' : 'anon-template'} key={template.id} role="listitem">
                          <div aria-label={`${template.title} template header`} className="anon-template-banner" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }}>
                            {(() => {
                              const Illustration = templateIllustrations[template.id];
                              return <button
                                aria-label={`Select ${templateTitles[template.id]} template`}
                                aria-pressed={selectedTemplateId === template.id}
                                className="anon-template-art-button"
                                onClick={() => selectTemplate(template.id)}
                                type="button"
                              ><span aria-hidden="true" className="anon-template-art"><Illustration size={30} strokeWidth={2.2} /></span></button>;
                            })()}
                            <div className="anon-template-title-wrap">
                              {editingTemplateTitleId === template.id ? (
                                <span
                                  aria-label="Edit template title"
                                  className="anon-template-title anon-template-title-editing"
                                  contentEditable
                                  ref={templateTitleEditorRef}
                                  onBlur={(event) => {
                                    const title = event.currentTarget.innerText.trim();
                                    setTemplateTitles((current) => ({ ...current, [template.id]: title || template.title }));
                                    setEditingTemplateTitleId(null);
                                  }}
                                  onInput={(event) => setTemplateTitles((current) => ({ ...current, [template.id]: event.currentTarget.innerText.slice(0, 40) }))}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  role="textbox"
                                  suppressContentEditableWarning
                                >{templateTitles[template.id]}</span>
                              ) : <button
                                aria-pressed={selectedTemplateId === template.id}
                                className="anon-template-title-select"
                                onClick={() => selectTemplate(template.id)}
                                type="button"
                              ><strong className="anon-template-title">{templateTitles[template.id]}</strong></button>}
                              <button
                                aria-label={`Edit ${templateTitles[template.id]} title`}
                                className="anon-template-title-edit"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingTemplateTitleId(template.id);
                                }}
                                type="button"
                              ><Pencil size={12} /></button>
                            </div>
                          </div>
                          <div className="anon-template-prompt-wrap">
                            {isEditingTemplate && selectedTemplateId === template.id ? (
                              <span
                                aria-label="Edit your anonymous message prompt"
                                className="anon-template-prompt anon-template-prompt-editing"
                                contentEditable
                                onInput={(event) => setTemplateText(event.currentTarget.innerText.slice(0, 180))}
                                role="textbox"
                                suppressContentEditableWarning
                              >{templateText}</span>
                            ) : (
                              <span className="anon-template-prompt">{selectedTemplateId === template.id ? templateText : template.prompt}</span>
                            )}
                            <button
                              aria-label={selectedTemplateId === template.id && isEditingTemplate ? 'Finish editing prompt' : 'Edit prompt'}
                              className="anon-template-edit"
                              onClick={() => {
                                if (selectedTemplateId === template.id) {
                                  setIsEditingTemplate((editing) => !editing);
                                } else {
                                  selectTemplate(template.id);
                                  setIsEditingTemplate(true);
                                }
                              }}
                              type="button"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                    <section className="anon-share-steps">
                      <div className="anon-share-step">
                        <h2><span aria-hidden="true" className="anon-step-number">1</span><span>Step 1: <strong>Copy your link</strong></span></h2>
                        {personalLinkUrl ? <p>{personalLinkUrl.toUpperCase()}</p> : null}
                        <button className="anon-copy-link" onClick={() => void copyLink()}><Link2 size={13} /> Copy link <Copy size={13} /></button>
                      </div>
                      <div className="anon-share-step">
                        <h2><span aria-hidden="true" className="anon-step-number">2</span><span>Step 2: <strong>Share link</strong> on your story</span></h2>
                        <div className="anon-share-action">
                          <span aria-hidden="true" className="anon-share-rays"><i /><i /><i /></span>
                          <button
                            className="anon-story-share"
                            onClick={() => void shareTemplate()}
                          ><Send size={13} /> Share!</button>
                          <span aria-hidden="true" className="anon-share-rays"><i /><i /><i /></span>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : meTab === 'link_settings' ? (
                  <section aria-labelledby="anon-link-settings-title" className="cr-anon-link-settings">
                    <h2 id="anon-link-settings-title">Anonymous link</h2>
                    <p className="cr-anon-link-settings__intro">Manage where people can send you private anonymous messages.</p>
                    {isLoadingInbox ? (
                      <div className="cr-anon-link-skeleton"><Skeleton style={{ width: '100%', height: 44, borderRadius: 12 }} /><Skeleton style={{ width: '100%', height: 48, borderRadius: 10 }} /></div>
                    ) : inboxLoadError ? (
                      <ErrorState title="Couldn’t load your link settings" description={inboxLoadError} onRetry={() => void retryInbox()} />
                    ) : link ? (
                      <>
                        <div className="cr-anon-link-url" aria-label="Your anonymous message link">{personalLinkUrl}</div>
                        <div className="cr-anon-link-actions">
                          <Button onClick={() => void shareTemplate()} variant="ghost"><Share2 size={14} /> Share</Button>
                          <Button onClick={() => void copyLink()} variant="ghost"><Copy size={14} /> Copy</Button>
                        </div>
                        <ListRow
                          className="cr-anon-link-row"
                          label="Accept messages"
                          sublabel="Turn off to pause new messages"
                          right={<Toggle label="Accept messages" on={link.enabled} onChange={busy ? undefined : (enabled) => void setLinkEnabled(enabled)} />}
                        />
                        <div className="cr-anon-regenerate-row">
                          <div><strong>Regenerate link</strong><small>Old link stops working</small></div>
                          <small className="cr-anon-regenerate-unavailable">Not available yet</small>
                        </div>
                        <p className="cr-anon-link-note" id="anon-regenerate-unavailable" role="note">Regenerating is unavailable because the current server endpoint does not invalidate existing links. Messages already in your Inbox are kept.</p>
                      </>
                    ) : (
                      <EmptyState title="No link yet" description="Create your personal link to start receiving anonymous messages." action={<Button disabled={busy} onClick={() => void createLink()}>{busy ? 'Creating…' : 'Create my link'}</Button>} />
                    )}
                  </section>
                ) : threadId ? (
                  <div className="anon-panel">
                    <button className="anon-back-link anon-back-button" onClick={() => { setThreadId(null); setMessages([]); void loadInbox(); }}>← Back to Inbox</button>
                    <div className="anon-inbox-heading"><div><span className="anon-avatar"><ShieldCheck size={16} /></span><div><h2>Anonymous</h2><p>Only you can see this.</p></div></div><button className="anon-outline-button" onClick={() => void blockThread()}>Block</button></div>
                    <div className="anon-thread">
                      {isLoadingMessages ? <div className="cr-anon-thread-skeleton" aria-label="Loading private conversation"><Skeleton style={{ width: '76%', height: 56, borderRadius: 12 }} /><Skeleton style={{ width: '68%', height: 56, borderRadius: 12 }} /></div> : messages.map((message) => <div className={message.is_mine ? 'anon-message anon-message-mine' : 'anon-message'} key={message.id}><small>{message.is_mine ? 'You' : 'Anonymous'} · {relativeTime(message.created_at)}</small><p>{message.body}</p>{!message.is_mine ? <div className="anon-message-tools">{threadOwner ? <button onClick={() => setPreviewMessage(message)}>Share publicly</button> : null}<button onClick={() => report('message', message.id)}>Report</button></div> : null}</div>)}
                    </div>
                    <form className="anon-reply-form" onSubmit={(event) => void sendMessage(event)}><input aria-label="Reply privately" maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Reply privately…" required value={messageDraft} /><button aria-label="Send private reply" className="cr-anon-send-reply" disabled={busy || !identity} type="submit"><Send size={16} /></button></form>
                  </div>
                ) : initialPostId ? null : (
                  <>
                    <h2 className="anon-inbox-title">Inbox <span>{threads.length}</span><button className="cr-anon-inbox-settings" onClick={() => setMeTab('link_settings')} type="button">Link settings</button></h2>
                    {isLoadingInbox ? <div className="cr-anon-inbox-skeleton" aria-label="Loading Inbox"><Skeleton style={{ width: '100%', height: 58, borderRadius: 12 }} /><Skeleton style={{ width: '100%', height: 58, borderRadius: 12 }} /></div>
                      : inboxLoadError ? <ErrorState title="Couldn’t load your Inbox" description={inboxLoadError} onRetry={() => void retryInbox()} />
                      : threads.length ? threads.map((thread) => <button className="anon-thread-row" key={thread.id} onClick={() => void openThread(thread.id)}><span className="anon-avatar"><ShieldCheck size={17} /></span><span className="anon-thread-row-copy"><strong>Anonymous</strong><small>{thread.last_message ?? 'Private conversation'} </small></span><small>{thread.message_count} · {thread.last_message_at ? relativeTime(thread.last_message_at) : ''}</small></button>)
                        : <EmptyState className="cr-anon-inbox-empty" title="No messages yet" description="Share your link to start getting anonymous messages." action={<Button onClick={() => void shareTemplate()}>Share my link</Button>} />}
                  </>
                )}
              </section>
            )}
          </>
        )}
        <footer className="anon-footer">Keep personal details out of messages. Commonroom may review reports to protect the community.</footer>
      </div>
      {activeCommentsPost ? (
        <div className="cr-anon-overlay" onClick={() => setOpenComments(null)}>
          <div className="cr-anon-overlay__content" onClick={(event) => event.stopPropagation()}>
            <Sheet className="cr-anon-sheet" full modal title={`Comments · ${activeCommentsPost.comments_count}`}>
              <button aria-label="Close comments" className="cr-anon-sheet__close" onClick={() => setOpenComments(null)} type="button"><X size={17} /></button>
              <p className="cr-anon-sheet__note">Comments here are anonymous too.</p>
              <div className="cr-anon-comments">
                {loadingCommentsFor === activeCommentsPost.id ? <div className="cr-anon-comments-loading"><Skeleton style={{ width: 30, height: 30, borderRadius: '50%' }} /><Skeleton style={{ width: '80%', height: 42, borderRadius: 8 }} /></div> : null}
                {(comments[activeCommentsPost.id] ?? []).filter((comment) => !comment.parent_comment_id).map((comment) => (
                  <div className="anon-comment-thread" key={comment.id}>
                    <div className="anon-comment">
                      <div><strong>{comment.author_handle}</strong><p>{comment.body}</p></div>
                      <div className="anon-comment-actions">
                        <button onClick={() => setReplyTargets((current) => ({ ...current, [activeCommentsPost.id]: current[activeCommentsPost.id]?.id === comment.id ? null : comment }))} type="button">Reply</button>
                        <button onClick={() => report('comment', comment.id)} type="button">Report</button>
                      </div>
                    </div>
                    {(comments[activeCommentsPost.id] ?? []).filter((reply) => reply.parent_comment_id === comment.id).map((reply) => (
                      <div className="anon-comment anon-comment-reply" key={reply.id}>
                        <div><strong>{reply.author_handle}</strong><p>{reply.body}</p></div>
                        <button onClick={() => report('comment', reply.id)} type="button">Report</button>
                      </div>
                    ))}
                  </div>
                ))}
                {!loadingCommentsFor && !(comments[activeCommentsPost.id] ?? []).length ? <EmptyState title="No comments yet" description="Be the first to comment anonymously." /> : null}
              </div>
              {replyTargets[activeCommentsPost.id] ? <p className="anon-replying-to">Replying to {replyTargets[activeCommentsPost.id]?.author_handle}<button onClick={() => setReplyTargets((current) => ({ ...current, [activeCommentsPost.id]: null }))} type="button">Cancel</button></p> : null}
              <form className="anon-reply-form" onSubmit={(event) => void submitComment(event, activeCommentsPost.id)}>
                <input aria-label={replyTargets[activeCommentsPost.id] ? 'Write an anonymous reply' : 'Write an anonymous comment'} maxLength={2000} onChange={(event) => setCommentDrafts((current) => ({ ...current, [activeCommentsPost.id]: event.target.value }))} placeholder={replyTargets[activeCommentsPost.id] ? `Reply to ${replyTargets[activeCommentsPost.id]?.author_handle}…` : 'Comment anonymously'} required value={commentDrafts[activeCommentsPost.id] ?? ''} />
                <button aria-label={replyTargets[activeCommentsPost.id] ? 'Send reply' : 'Send comment'} disabled={!identity} type="submit"><Send size={16} /></button>
              </form>
            </Sheet>
          </div>
        </div>
      ) : null}
      {reportTarget ? (
        <div className="cr-anon-overlay" onClick={() => setReportTarget(null)}>
          <div className="cr-anon-overlay__content" onClick={(event) => event.stopPropagation()}>
            <Sheet className="cr-anon-sheet cr-anon-sheet--compact" modal title={`Report ${reportTarget.targetKind}`}>
              <p className="cr-anon-sheet__note">Pick the closest reason. Your report is anonymous.</p>
              <form className="cr-anon-report-form" onSubmit={(event) => void submitReport(event)}>
                {['Spam', 'Harassment or bullying', 'Hate speech', 'Sexual content', 'Self-harm', 'Something else'].map((reason) => (
                  <label className="cr-anon-report-option" key={reason}><input checked={reportReason === reason} name="anonymous-report-reason" onChange={() => setReportReason(reason)} required type="radio" value={reason} /><span>{reason}</span></label>
                ))}
                <textarea aria-label="Add details (optional)" maxLength={500} onChange={(event) => setReportDetails(event.target.value)} placeholder="Add details (optional)" value={reportDetails} />
                <div className="cr-anon-sheet__actions">
                  <Button onClick={() => setReportTarget(null)} variant="ghost">Cancel</Button>
                  <Button disabled={!reportReason || isSubmittingReport} type="submit">{isSubmittingReport ? 'Sending…' : 'Report'}</Button>
                </div>
              </form>
            </Sheet>
          </div>
        </div>
      ) : null}
      {shareTarget ? (
        <div className="cr-anon-overlay" onClick={() => setShareTarget(null)}>
          <div className="cr-anon-overlay__content" onClick={(event) => event.stopPropagation()}>
            <Sheet className="cr-anon-sheet cr-anon-sheet--compact" modal title="Share post">
              <div className="cr-anon-share-preview"><span className="anon-avatar"><ShieldCheck size={17} /></span><p>{shareTarget.body}</p></div>
              <div className="cr-anon-share-actions">
                <Button onClick={() => void copyPostLink()}><Copy size={15} /> Copy link</Button>
                <Button onClick={() => void sharePostWithDevice()} variant="ghost"><Share2 size={15} /> More</Button>
              </div>
            </Sheet>
          </div>
        </div>
      ) : null}
      {previewMessage && threadOwner ? (
        <div className="cr-anon-overlay" onClick={() => setPreviewMessage(null)}>
          <div className="cr-anon-overlay__content" onClick={(event) => event.stopPropagation()}>
            <Sheet className="cr-anon-sheet cr-anon-sheet--compact" modal title="Share this message publicly?">
              <div className="cr-anon-message-share-preview"><span className="anon-avatar"><ShieldCheck size={17} /></span><p>{previewMessage.body}</p></div>
              <p className="cr-anon-sheet__note">It will appear in the Anonymous feed. Your name and the sender’s identity are not shown. Nothing else from your Inbox is shared.</p>
              <div className="cr-anon-sheet__actions">
                <Button onClick={() => setPreviewMessage(null)} variant="ghost">Cancel</Button>
                <Button disabled={busy} onClick={() => void confirmShare()}>{busy ? 'Sharing…' : 'Share'}</Button>
              </div>
            </Sheet>
          </div>
        </div>
      ) : null}
      {identityPromptOpen && !identity ? (
        <div className="anon-identity-modal-backdrop">
          <section aria-labelledby="anon-identity-modal-title" aria-modal="true" className="anon-identity-modal" role="dialog">
            <button aria-label="Close anonymous name setup" className="anon-identity-modal-close" onClick={() => { setIdentityPromptOpen(false); setError(''); }} type="button">×</button>
            <h2 id="anon-identity-modal-title">Choose your Anonymous name</h2>
            {error && !error.toLowerCase().includes('sign in') ? <p className="anon-identity-modal-error" role="alert">{error}</p> : null}
            <IdentityForm busy={busy} value={handleDraft} onChange={setHandleDraft} onSubmit={createIdentity} />
          </section>
        </div>
      ) : null}
      {imagePreview ? (
        <div className="anon-media-viewer-backdrop" onClick={() => setImagePreview(null)} role="dialog" aria-modal="true" aria-label="Image preview">
          <button aria-label="Close image preview" className="anon-media-viewer-close" onClick={() => setImagePreview(null)} type="button">×</button>
          <img alt={imagePreview.alt} className="anon-image-viewer-image" onClick={(event) => event.stopPropagation()} src={imagePreview.url} />
        </div>
      ) : null}
      {swipeTutorialOpen ? (
        <div className="anon-swipe-tutorial-backdrop">
          <section aria-labelledby="anon-swipe-tutorial-title" aria-modal="true" className="anon-swipe-tutorial" role="dialog">
            <button aria-label="Dismiss video viewer tutorial" className="anon-media-viewer-close" onClick={() => { setSwipeTutorialOpen(false); setPendingVideoViewer(null); }} type="button">×</button>
            <span className="anon-eyebrow">VIDEO VIEWER</span>
            <h2 id="anon-swipe-tutorial-title">Move through videos</h2>
            <p>Swipe up for the next video or down for the previous one. You can also use the on-screen arrows or keyboard arrow keys.</p>
            <button className="anon-button" onClick={showVideoViewer} type="button">Got it</button>
          </section>
        </div>
      ) : null}
      {videoViewer ? (
        <div
          className="anon-video-viewer-backdrop"
          onTouchStart={(event) => { viewerTouchStartRef.current = event.touches[0]?.clientY ?? null; }}
          onTouchEnd={(event) => {
            const start = viewerTouchStartRef.current;
            viewerTouchStartRef.current = null;
            const end = event.changedTouches[0]?.clientY;
            if (start !== null && end !== undefined && Math.abs(start - end) > 45) stepVideoViewer(start > end ? 1 : -1);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Anonymous videos"
        >
          <button aria-label="Close video viewer" className="anon-media-viewer-close" onClick={() => setVideoViewer(null)} type="button">×</button>
          {(() => {
            const post = videoViewer.posts[videoViewer.index];
            const item = post?.media_items?.find((media) => media.mediaType === 'video');
            if (!post || !item) return <p className="anon-video-viewer-error" role="alert">This video is unavailable.</p>;
            const mediaUrl = resolveAnonMediaUrl(item.path);
            return (
              <div className="anon-video-viewer-content">
                <button aria-label="Previous video" className="anon-video-viewer-nav previous" disabled={videoViewer.index === 0} onClick={() => stepVideoViewer(-1)} type="button">↑</button>
                <video autoPlay controls key={post.id} playsInline src={mediaUrl}>Your browser does not support video playback.</video>
                <button aria-label="Next video" className="anon-video-viewer-nav next" disabled={videoViewer.index === videoViewer.posts.length - 1} onClick={() => stepVideoViewer(1)} type="button">↓</button>
                <div className="anon-video-viewer-caption"><span>{post.author_handle} · {videoViewer.index + 1} of {videoViewer.posts.length}</span><strong>{post.title}</strong><p>{post.body}</p></div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* Self-Contained Anonymous Create Studio Modal */}
      {inlineCreateOpen ? (
        <div className="anon-inline-modal-backdrop" onClick={() => setInlineCreateOpen(false)}>
          <div className="anon-inline-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create Anonymous Post">
            <div className="anon-inline-modal-header">
              <div className="anon-inline-modal-title">
                <ShieldCheck size={20} color="#38bdf8" />
                <span>Create Anonymous Post</span>
              </div>
              <button
                aria-label="Close"
                className="anon-inline-modal-close"
                onClick={() => setInlineCreateOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form className="anon-inline-modal-body" onSubmit={(e) => void submitInlinePost(e)}>
              {/* Scope row */}
              <div className="anon-create-scope-row" style={{ margin: 0 }}>
                <span>Posting to</span>
                <strong>Campus & All Universities</strong>
                <span>Identity protected</span>
              </div>

              {/* Theme selector */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8, fontWeight: 600 }}>Card Gradient Theme</label>
                <div className="anon-theme-selector">
                  {anonCardThemes.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      aria-label={th.label}
                      className={`anon-theme-circle ${composeTheme === th.id ? 'active' : ''}`}
                      style={{ background: th.bg }}
                      onClick={() => setComposeTheme(th.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8, fontWeight: 600 }}>Live Feed Preview</label>
                <div className={`anon-compose-card-preview anon-text-card-${composeTheme === 'blue-hour' ? 'blue' : composeTheme === 'soft-sky' ? 'sky' : composeTheme === 'warm-glow' ? 'warm' : 'rose'}`}>
                  <span className="anon-card-preview-scope">Campus Confession</span>
                  <p className="anon-card-preview-text">
                    {composeBody.trim() || 'Type your message below to preview your live anonymous card…'}
                  </p>
                  <div className="anon-card-preview-footer">
                    <span>{identity?.handle || 'Anonymous Student'}</span>
                    <span>General · just now</span>
                  </div>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8, fontWeight: 600 }}>Quick Prompt Starters</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f1f5f9',
                        padding: '6px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setComposeTitle(qp.label);
                        if (!composeBody) setComposeBody(qp.prompt);
                      }}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title input */}
              <label style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                Title (optional)
                <input
                  maxLength={100}
                  placeholder="Short headline"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: 14,
                  }}
                />
              </label>

              {/* Body textarea */}
              <label style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                Confession / Message
                <textarea
                  maxLength={1000}
                  required
                  rows={4}
                  placeholder="What do you want to share with your campus anonymously? Speak your mind freely..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#ffffff',
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {composeBody.length}/1000 characters
                </span>
                <button
                  className="primary-button"
                  disabled={isSubmittingPost || !composeBody.trim()}
                  type="submit"
                  style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Sparkles size={16} />
                  <span>{isSubmittingPost ? 'Publishing…' : 'Publish Anonymously'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function IdentityForm({ busy, value, onChange, onSubmit }: {
  busy: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="anon-identity-form" onSubmit={onSubmit}>
      <label htmlFor="anonymous-handle">Anonymous name</label>
      <p>This will be your anonymous identity. No one can know who you are—not even us.</p>
      <div><input autoComplete="off" id="anonymous-handle" maxLength={24} onChange={(event) => onChange(event.target.value)} required value={value} /><button className="anon-outline-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Continue'}</button></div>
    </form>
  );
}
