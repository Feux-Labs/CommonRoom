'use client';

import { CircleHelp, Copy, Heart, ImagePlus, Link2, MessageCircle, MessagesSquare, Pencil, Quote, Send, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import Image from 'next/image';

type Scope = 'school' | 'all_nigerian_schools';
type FeedSort = 'new' | 'hot' | 'trending';
type FeedTab = 'for_you' | 'general' | 'hot' | 'trending';
type MeTab = 'try_these' | 'inbox';
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
  'never-have': Sparkles,
  tbh: MessagesSquare,
  custom: CircleHelp,
};
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
};
type PostPage = { posts: Post[]; hasMore: boolean; nextCursor: string | null };
type Comment = { id: string; parent_comment_id: string | null; author_handle: string; body: string; created_at: string };
type InboxLink = { token: string; enabled: boolean };
type Thread = { id: string; last_message: string | null; last_message_at: string | null; message_count: number };
type InboxMessage = { id: string; body: string; is_mine: boolean; participant_label: 'Anonymous'; created_at: string };
type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { message?: string } };

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

export function AnonymousExperience({ initialInboxToken, initialPostId }: {
  initialInboxToken?: string;
  initialPostId?: string;
}) {
  const [session, setSession] = useState<Session | null>(null);
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [feedLoadError, setFeedLoadError] = useState('');
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postMediaFiles, setPostMediaFiles] = useState<File[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, Comment | null>>({});
  const [link, setLink] = useState<InboxLink | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadOwner, setThreadOwner] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [inboxPromptEnabled, setInboxPromptEnabled] = useState<boolean | null>(null);
  const [previewMessage, setPreviewMessage] = useState<InboxMessage | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const feedSentinelRef = useRef<HTMLDivElement | null>(null);
  const feedGenerationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const scope: Scope = feedTab === 'for_you' ? 'school' : 'all_nigerian_schools';
  const feedSort: FeedSort = feedTab === 'hot' || feedTab === 'trending' ? feedTab : 'new';

  useEffect(() => {
    if (editingTemplateTitleId) templateTitleEditorRef.current?.focus();
  }, [editingTemplateTitleId]);

  const request = useCallback(async <T,>(path: string, method = 'GET', payload?: unknown): Promise<T> => {
    if (!session) throw new Error('Anonymous access is still starting. Please try again.');
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
      throw new Error(failure?.error?.message ?? `Request failed with status ${response.status}.`);
    }
    if (!result || !('data' in result)) throw new Error('The Anonymous service returned an invalid response.');
    return result.data;
  }, [session]);

  const loadIdentity = useCallback(async () => {
    const result = await request<Identity | null>('/identity');
    setIdentity(result);
    setHandleDraft(result?.handle ?? `Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
    return result;
  }, [request]);

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
        const [schoolPosts, widePosts] = await Promise.all([
          request<Post[]>(`/posts?scope=school&id=${initialPostId}`),
          request<Post[]>(`/posts?scope=all_nigerian_schools&id=${initialPostId}`),
        ]);
        if (generation === feedGenerationRef.current) setPosts([...schoolPosts, ...widePosts]);
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
        setPosts(result.posts);
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
        return [...current, ...result.posts.filter((post) => !existingIds.has(post.id))];
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
    const [currentLink, currentThreads] = await Promise.all([
      request<InboxLink | null>('/inbox/link'),
      request<Thread[]>('/inbox'),
    ]);
    setLink(currentLink);
    setThreads(currentThreads);
  }, [request]);

  const loadMessages = useCallback(async (id: string) => {
    const result = await request<InboxMessage[]>(`/inbox/threads/${id}`);
    setMessages(result);
  }, [request]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = getBrowserSupabase();
        const current = await supabase.auth.getSession();
        let activeSession = current.data.session;
        if (!activeSession) {
          const guest = await supabase.auth.signInAnonymously();
          if (guest.error) throw guest.error;
          activeSession = guest.data.session;
        }
        if (!activeSession) throw new Error('Anonymous access could not be started. Please try again.');
        if (!active) return;
        setSession(activeSession);
        setReady(true);
      } catch (authError) {
        if (active) {
          setError(authError instanceof Error ? authError.message : 'Anonymous access could not be started.');
          setHandleDraft((current) => current || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
          setIdentityPromptOpen(true);
          setReady(true);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadIdentity()
      .then((loadedIdentity) => {
        if (!loadedIdentity) setIdentityPromptOpen(true);
      })
      .catch((identityError: unknown) => {
        setError(identityError instanceof Error ? identityError.message : 'Your Anonymous identity could not be loaded.');
        setHandleDraft((current) => current || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
        setIdentityPromptOpen(true);
      });
  }, [loadIdentity, session]);

  useEffect(() => {
    if (!session) return;
    void loadPosts();
  }, [loadPosts, session]);

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
    if (!session || view !== 'me' || initialInboxToken) return;
    void loadInbox().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Your Inbox could not be loaded.'));
  }, [initialInboxToken, loadInbox, session, view]);

  useEffect(() => {
    if (!session || !initialInboxToken) return;
    void request<{ enabled: boolean }>(`/inbox/links/${initialInboxToken}`)
      .then((prompt) => setInboxPromptEnabled(prompt.enabled))
      .catch((promptError: unknown) => {
        setInboxPromptEnabled(false);
        setError(promptError instanceof Error ? promptError.message : 'This anonymous link could not be opened.');
      });
  }, [initialInboxToken, request, session]);

  const scopeLabel = useMemo(() => scope === 'school' ? 'For You' : 'General', [scope]);
  const rankedPosts = useMemo(() => rankPosts(posts, feedSort), [feedSort, posts]);

  async function createIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request<Identity>('/identity', 'POST', { handle: handleDraft });
      setIdentity(result);
      setIdentityPromptOpen(false);
      setNotice(`You’re in as ${result.handle}.`);
    } catch (identityError) {
      setError(identityError instanceof Error ? identityError.message : 'Your Anonymous name could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setError('Anonymous access is still starting. Please try again.');
      return;
    }
    if (!identity) {
      setNotice('Choose your Anonymous name to publish.');
      return;
    }
    setBusy(true);
    setError('');
    const uploadedPaths: string[] = [];
    try {
      const storage = getBrowserSupabase().storage.from('post-media');
      const mediaItems: MediaItem[] = [];
      for (const file of postMediaFiles) {
        const path = `${session.user.id}/anonymous/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { data, error: uploadError } = await storage.upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(data.path);
        mediaItems.push({ path: data.path, mediaType: file.type.startsWith('video/') ? 'video' : 'photo' });
      }
      const created = await request<Post>('/posts', 'POST', { title: postTitle, body: postBody, scope, mediaItems });
      setPosts((current) => [created, ...current]);
      setPostTitle('');
      setPostBody('');
      setPostMediaFiles([]);
      setNotice('Your post is live in the Anonymous Feed.');
    } catch (publishError) {
      const errorMessage = publishError instanceof Error ? publishError.message : 'Your post could not be published.';
      if (uploadedPaths.length) {
        const { error: cleanupError } = await getBrowserSupabase().storage.from('post-media').remove(uploadedPaths);
        setError(cleanupError
          ? `${errorMessage} Uploaded media could not be cleaned up: ${cleanupError.message}`
          : errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(post: Post) {
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
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    try {
      const result = await request<Comment[]>(`/posts/${postId}/comments`);
      setComments((current) => ({ ...current, [postId]: result }));
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Comments could not be loaded.');
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
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

  async function report(targetKind: 'post' | 'comment' | 'message', targetId: string) {
    const reason = window.prompt('Tell us why you are reporting this content:');
    if (!reason?.trim()) return;
    try {
      await request('/reports', 'POST', { targetKind, targetId, reason });
      setNotice('Report sent for review.');
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Your report could not be sent.');
    }
  }

  async function createLink() {
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
    setThreadId(id);
    setThreadOwner(true);
    setPreviewMessage(null);
    try {
      await loadMessages(id);
    } catch (threadError) {
      setError(threadError instanceof Error ? threadError.message : 'This private conversation could not be opened.');
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    if (!identity) {
      setNotice('Choose your Anonymous name before sending.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (initialInboxToken && !threadId) {
        const result = await request<{ thread_id: string }>(`/inbox/links/${initialInboxToken}/messages`, 'POST', { body: messageDraft });
        setThreadId(result.thread_id);
        setThreadOwner(false);
        setMessageDraft('');
        await loadMessages(result.thread_id);
        setNotice('Your anonymous message was sent. Replies stay in this private thread.');
      } else if (threadId) {
        const result = await request<InboxMessage>(`/inbox/threads/${threadId}`, 'POST', { body: messageDraft });
        setMessages((current) => [...current, result]);
        setMessageDraft('');
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Your message could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  async function blockThread() {
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
    if (!threadId || !previewMessage) return;
    try {
      const created = await request<Post>(`/inbox/threads/${threadId}/share`, 'POST', {
        messageId: previewMessage.id,
        scope,
      });
      setPosts((current) => [created, ...current]);
      setPreviewMessage(null);
      setNotice('Only the selected message was published as a new Feed post.');
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'The message could not be shared.');
    }
  }

  async function sharePost(post: Post) {
    const url = `${window.location.origin}/anonymous/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(`${post.title}\n${url}`);
      setNotice('Post link copied.');
    } catch {
      window.prompt('Copy this link:', url);
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

  if (!ready) return <main className="anon-shell"><p className="anon-loading">Opening Anonymous…</p></main>;

  return (
    <main className="anon-shell">
      <div className="anon-wrap">
        <header className="anon-topbar">
          <a className="anon-brand" href="/">
            <Image
              alt="Common Room"
              className="anon-brand-logo"
              height={26}
              priority
              src="/common-room-full-logo-white.png"
              width={120}
            />
            <span className="anon-badge">ANONYMOUS</span>
          </a>
          <a className="anon-home-link" href="/">Back to Common Room</a>
        </header>

        {error ? <div className="anon-feedback anon-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div> : null}
        {notice ? <div className="anon-feedback anon-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div> : null}

        {initialInboxToken ? (
          <section className="anon-panel anon-prompt-panel">
            <a className="anon-back-link" href="/anonymous">← Back to Anonymous Feed</a>
            <span className="anon-eyebrow">PRIVATE MESSAGE · ONLY THE RECIPIENT SEES THIS</span>
            <h2>Send an honest note.</h2>
            {inboxPromptEnabled === false ? <p>This link is paused or unavailable.</p> : (
              <>
                <form className="anon-form" onSubmit={(event) => void sendMessage(event)}>
                  <textarea aria-label="Anonymous message" maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write your message…" required rows={5} value={messageDraft} />
                  <div className="anon-form-foot"><span>Replies stay in this private Inbox thread.</span><button className="anon-button" disabled={busy || !identity} type="submit">{busy ? 'Sending…' : 'Send anonymously'}</button></div>
                </form>
              </>
            )}
            {threadId ? (
              <div className="anon-thread">
                <h3>Your private conversation</h3>
                {messages.map((message) => <div className={message.is_mine ? 'anon-message anon-message-mine' : 'anon-message'} key={message.id}><small>{message.is_mine ? 'You' : 'Anonymous'} · {relativeTime(message.created_at)}</small><p>{message.body}</p></div>)}
                <form className="anon-reply-form" onSubmit={(event) => void sendMessage(event)}><textarea aria-label="Reply privately" maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Reply privately…" required rows={3} value={messageDraft} /><button className="anon-button" disabled={busy} type="submit">Reply</button></form>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <nav aria-label="Anonymous views" className="anon-tabs">
              <button aria-current={view === 'feed' ? 'page' : undefined} className={view === 'feed' ? 'anon-tab anon-tab-active' : 'anon-tab'} onClick={() => setView('feed')}><MessageCircle size={16} /> Feed</button>
              <button aria-current={view === 'me' ? 'page' : undefined} className={view === 'me' ? 'anon-tab anon-tab-active' : 'anon-tab'} onClick={() => { setView('me'); setMeTab('try_these'); setThreadId(null); }}><ShieldCheck size={16} /> ME</button>
            </nav>

            {view === 'feed' ? (
              <div className="anon-content">
                <div className="anon-discovery-row">
                  <div className="anon-feed-tabs" role="tablist" aria-label="Anonymous Feed">
                    <button aria-selected={feedTab === 'for_you'} className={feedTab === 'for_you' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('for_you')} role="tab">For You</button>
                    <button aria-selected={feedTab === 'general'} className={feedTab === 'general' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('general')} role="tab">General</button>
                    <button aria-selected={feedTab === 'hot'} className={feedTab === 'hot' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('hot')} role="tab">Hot</button>
                    <button aria-selected={feedTab === 'trending'} className={feedTab === 'trending' ? 'anon-scope anon-feed-tab anon-scope-active' : 'anon-scope anon-feed-tab'} onClick={() => setFeedTab('trending')} role="tab">Trending</button>
                  </div>
                  <button className="anon-write-toggle" onClick={() => setComposerOpen((open) => !open)}>{composerOpen ? 'Close' : '+ Write'}</button>
                </div>
                {composerOpen ? <section className="anon-panel anon-composer">
                  <div className="anon-panel-heading"><span className="anon-composer-icon"><Send size={16} /></span><div><strong>Start a conversation</strong><small>Your profile is never attached to a public post.</small></div></div>
                  <form className="anon-post-form" onSubmit={(event) => void publishPost(event)}>
                    <input aria-label="Post title" maxLength={120} onChange={(event) => setPostTitle(event.target.value)} placeholder="Give it a short title" required value={postTitle} />
                    <textarea aria-label="Anonymous post" maxLength={3000} onChange={(event) => setPostBody(event.target.value)} placeholder="What would you like to say?" required rows={3} value={postBody} />
                    <label className="anon-media-picker">
                      <ImagePlus size={16} />
                      <span>Add up to 10 photos or one video</span>
                      <input
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                        aria-label="Attach photos or a video"
                        multiple
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          const hasVideo = files.some((file) => file.type.startsWith('video/'));
                          const isValid = files.length <= 10
                            && (!hasVideo || (files.length === 1 && files[0].size <= 100 * 1024 * 1024))
                            && files.every((file) => file.type.startsWith('video/')
                              ? ['video/mp4', 'video/quicktime'].includes(file.type)
                              : ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024);
                          if (!isValid) {
                            setError('Choose up to 10 JPG, PNG, or WebP photos (10 MB each), or one MP4/MOV video (100 MB max).');
                            event.target.value = '';
                            return;
                          }
                          setError('');
                          setPostMediaFiles(files);
                        }}
                        type="file"
                      />
                    </label>
                    {postMediaFiles.length ? <ul className="anon-media-file-list">
                      {postMediaFiles.map((file, index) => <li key={`${file.name}-${index}`}>
                        <span>{file.name}</span>
                        <button onClick={() => setPostMediaFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove</button>
                      </li>)}
                    </ul> : null}
                    <div className="anon-form-foot"><span>Visible to {scopeLabel}</span><button className="anon-button" disabled={busy || !identity} type="submit">{busy ? 'Posting…' : 'Post anonymously'}</button></div>
                  </form>
                </section> : null}

                <div className="anon-feed">
                  {rankedPosts.length ? rankedPosts.map((post) => (
                    <article className="anon-post" key={post.id}>
                      <div className="anon-post-top"><span className="anon-avatar"><ShieldCheck size={17} /></span><div><strong>{post.author_handle}</strong><small>{post.scope === 'school' ? 'For You' : 'General'} · {relativeTime(post.created_at)}</small></div><button aria-label="Report post" className="anon-more" onClick={() => void report('post', post.id)}>•••</button></div>
                      <h2>{post.title}</h2><p className="anon-post-body">{post.body}</p>
                      {post.media_items?.length ? <div className="anon-post-media">
                        {post.media_items.map((item) => {
                          const { data } = getBrowserSupabase().storage.from('post-media').getPublicUrl(item.path);
                          return item.mediaType === 'video'
                            ? <video controls key={item.path} preload="metadata" src={data.publicUrl}>Your browser does not support video playback.</video>
                            : <img alt="Anonymous post attachment" key={item.path} loading="lazy" src={data.publicUrl} />;
                        })}
                      </div> : null}
                      <div className="anon-post-actions">
                        <button aria-pressed={post.liked_by_me} onClick={() => void toggleLike(post)}><Heart size={16} fill={post.liked_by_me ? 'currentColor' : 'none'} /> {post.likes_count}</button>
                        <button onClick={() => void toggleComments(post.id)}><MessageCircle size={16} /> {post.comments_count}</button>
                        <button onClick={() => void sharePost(post)}><Share2 size={16} /> Share</button>
                        {post.is_mine ? <button onClick={() => void deletePost(post)}>Delete</button> : null}
                      </div>
                      {openComments === post.id ? (
                        <div className="anon-comments">
                          {(comments[post.id] ?? []).filter((comment) => !comment.parent_comment_id).map((comment) => (
                            <div className="anon-comment-thread" key={comment.id}>
                              <div className="anon-comment">
                                <div><strong>{comment.author_handle}</strong><p>{comment.body}</p></div>
                                <div className="anon-comment-actions">
                                  <button onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: current[post.id]?.id === comment.id ? null : comment }))} type="button">Reply</button>
                                  <button onClick={() => void report('comment', comment.id)} type="button">Report</button>
                                </div>
                              </div>
                              {(comments[post.id] ?? []).filter((reply) => reply.parent_comment_id === comment.id).map((reply) => (
                                <div className="anon-comment anon-comment-reply" key={reply.id}>
                                  <div><strong>{reply.author_handle}</strong><p>{reply.body}</p></div>
                                  <button onClick={() => void report('comment', reply.id)} type="button">Report</button>
                                </div>
                              ))}
                            </div>
                          ))}
                          {replyTargets[post.id] ? <p className="anon-replying-to">Replying to {replyTargets[post.id]?.author_handle}<button onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: null }))} type="button">Cancel</button></p> : null}
                          <form className="anon-reply-form" onSubmit={(event) => void submitComment(event, post.id)}><input aria-label={replyTargets[post.id] ? 'Write an anonymous reply' : 'Write an anonymous comment'} maxLength={2000} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder={replyTargets[post.id] ? `Reply to ${replyTargets[post.id]?.author_handle}…` : 'Add a comment…'} required value={commentDrafts[post.id] ?? ''} /><button aria-label={replyTargets[post.id] ? 'Send reply' : 'Send comment'} disabled={!identity} type="submit"><Send size={16} /></button></form>
                        </div>
                      ) : null}
                    </article>
                  )) : isLoadingPosts ? <p aria-live="polite" className="anon-feed-status">Loading conversations…</p>
                    : feedLoadError ? null
                      : <div className="anon-empty"><span>✦</span><h2>No conversations yet</h2><p>Start a conversation in {scopeLabel}.</p></div>}
                  {!initialPostId ? <div aria-hidden="true" className="anon-feed-sentinel" ref={feedSentinelRef} /> : null}
                  {isLoadingMorePosts ? <p aria-live="polite" className="anon-feed-status">Loading more conversations…</p> : null}
                  {feedLoadError ? <div className="anon-feed-status anon-feed-retry" role="alert"><span>{feedLoadError}</span><button className="anon-outline-button" onClick={() => void (nextCursor ? loadMorePosts() : loadPosts())} type="button">Retry</button></div> : null}
                  {!initialPostId && rankedPosts.length > 0 && !hasMorePosts && !isLoadingPosts
                    ? <p aria-live="polite" className="anon-feed-status">You’re all caught up.</p>
                    : null}
                </div>
              </div>
            ) : (
              <section className="anon-content anon-inbox-content">
                <nav aria-label="ME sections" className="anon-me-tabs">
                  <button aria-selected={meTab === 'try_these'} className={meTab === 'try_these' ? 'anon-me-tab anon-me-tab-active' : 'anon-me-tab'} onClick={() => setMeTab('try_these')}>Try these</button>
                  <button aria-selected={meTab === 'inbox'} className={meTab === 'inbox' ? 'anon-me-tab anon-me-tab-active' : 'anon-me-tab'} onClick={() => { setMeTab('inbox'); setThreadId(null); }}>Inbox</button>
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
                ) : threadId ? (
                  <div className="anon-panel">
                    <button className="anon-back-link anon-back-button" onClick={() => { setThreadId(null); setMessages([]); void loadInbox(); }}>← Back to Inbox</button>
                    <div className="anon-inbox-heading"><div><span className="anon-eyebrow">PRIVATE THREAD</span><h2>Conversation</h2><p>The other participant is shown only as Anonymous.</p></div><button className="anon-outline-button" onClick={() => void blockThread()}>Block</button></div>
                    <div className="anon-thread">
                      {messages.map((message) => <div className={message.is_mine ? 'anon-message anon-message-mine' : 'anon-message'} key={message.id}><small>{message.is_mine ? 'You' : 'Anonymous'} · {relativeTime(message.created_at)}</small><p>{message.body}</p>{threadOwner ? <div className="anon-message-tools"><button onClick={() => setPreviewMessage(message)}>Preview & share to Feed</button><button onClick={() => void report('message', message.id)}>Report</button></div> : null}</div>)}
                    </div>
                    {previewMessage ? <div className="anon-share-preview"><span className="anon-eyebrow">PUBLIC PREVIEW</span><p>{previewMessage.body}</p><small>Only this selected message will be public. The private conversation remains private.</small><div><button className="anon-outline-button" onClick={() => setPreviewMessage(null)}>Cancel</button><button className="anon-button" onClick={() => void confirmShare()}>Confirm share</button></div></div> : null}
                    <form className="anon-reply-form" onSubmit={(event) => void sendMessage(event)}><textarea aria-label="Private reply" maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Reply privately…" required rows={3} value={messageDraft} /><button className="anon-button" disabled={busy || !identity} type="submit">Send reply</button></form>
                  </div>
                ) : initialPostId ? null : (
                  <>
                    <h2 className="anon-inbox-title">Inbox <span>{threads.length}</span></h2>
                    {threads.length ? threads.map((thread) => <button className="anon-thread-row" key={thread.id} onClick={() => void openThread(thread.id)}><span className="anon-avatar"><ShieldCheck size={17} /></span><span className="anon-thread-row-copy"><strong>Anonymous</strong><small>{thread.last_message ?? 'Private conversation'} </small></span><small>{thread.message_count} · {thread.last_message_at ? relativeTime(thread.last_message_at) : ''}</small></button>) : <div className="anon-empty anon-inbox-empty"><span>✦</span><h2>Your Inbox is quiet</h2><p>Messages sent through your link will appear here as Anonymous.</p></div>}
                  </>
                )}
              </section>
            )}
          </>
        )}
        <footer className="anon-footer">Keep personal details out of messages. Common Room may review reports to protect the community.</footer>
      </div>
      {identityPromptOpen && !identity ? (
        <div className="anon-identity-modal-backdrop">
          <section aria-labelledby="anon-identity-modal-title" aria-modal="true" className="anon-identity-modal" role="dialog">
            <button aria-label="Close anonymous name setup" className="anon-identity-modal-close" onClick={() => { setIdentityPromptOpen(false); setError(''); }} type="button">×</button>
            <h2 id="anon-identity-modal-title">Choose your Anonymous name</h2>
            {error ? <p className="anon-identity-modal-error" role="alert">{error}</p> : null}
            <IdentityForm busy={busy} value={handleDraft} onChange={setHandleDraft} onSubmit={createIdentity} />
          </section>
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
