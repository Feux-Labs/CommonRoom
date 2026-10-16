import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { CircleQuestionMark, Copy, Heart, Link2, MessageCircle, MessagesSquare, Pencil, Quote, Send, Sparkles } from 'lucide-react-native/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../components/IconSymbol';
import { getAnonymousAccessToken, getApiBaseUrl, apiRequest } from '../services/api';
import {
  AnonymousComment,
  AnonymousIdentity,
  AnonymousInboxLink,
  AnonymousInboxMessage,
  AnonymousInboxThread,
  AnonymousPost,
  AnonymousScope,
} from '../types/anonymous';

type AnonymousScreenProps = {
  onBack: () => void;
};

type ViewMode = 'feed' | 'inbox';
type FeedSort = 'new' | 'hot' | 'trending';
type FeedTab = 'for_you' | 'general' | 'hot' | 'trending';
type MeTab = 'try_these' | 'inbox';

const inboxTemplates = [
  { id: 'confession', title: 'Confessions', prompt: 'Send me an anonymous confession 👀', colors: ['#31a9ed', '#6844ed'] as const },
  { id: 'crush', title: 'Your crush', prompt: 'Tell me who your crush is, anonymously 🤫', colors: ['#f04c88', '#ad38d2'] as const },
  { id: 'three-words', title: 'Three words', prompt: 'Describe me in 3 words — anonymously', colors: ['#ec3158', '#a91748'] as const },
  { id: 'never-have', title: 'Never have I ever', prompt: 'Send me a never-have-I-ever 👀', colors: ['#7128d7', '#451178'] as const },
  { id: 'tbh', title: 'Real talk', prompt: 'Give me your honest take — no names attached', colors: ['#f04b74', '#ef78c5'] as const },
  { id: 'custom', title: 'Your own question', prompt: 'Ask me anything anonymously…', colors: ['#2663d9', '#13295c'] as const },
] as const;
type InboxTemplateId = (typeof inboxTemplates)[number]['id'];
const templateIllustrations = {
  confession: MessageCircle,
  crush: Heart,
  'three-words': Quote,
  'never-have': Sparkles,
  tbh: MessagesSquare,
  custom: CircleQuestionMark,
} satisfies Record<InboxTemplateId, typeof MessageCircle>;

function webBaseUrl() {
  return getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function rankPosts(posts: AnonymousPost[], sort: FeedSort) {
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

export function AnonymousScreen({ onBack }: AnonymousScreenProps) {
  const styles = createStyles();
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState('');
  const [identity, setIdentity] = useState<AnonymousIdentity | null>(null);
  const [suggestedHandle, setSuggestedHandle] = useState(`Ghost ${Math.floor(1000 + Math.random() * 9000)}`);
  const [view, setView] = useState<ViewMode>('feed');
  const [meTab, setMeTab] = useState<MeTab>('try_these');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(inboxTemplates[0].id);
  const [templateText, setTemplateText] = useState<string>(inboxTemplates[0].prompt);
  const [templateTitles, setTemplateTitles] = useState<Record<string, string>>(() => Object.fromEntries(inboxTemplates.map((template) => [template.id, template.title])));
  const [editingTemplateTitleId, setEditingTemplateTitleId] = useState<string | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>('for_you');
  const [composerOpen, setComposerOpen] = useState(false);
  const [posts, setPosts] = useState<AnonymousPost[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [commentsByPost, setCommentsByPost] = useState<Record<string, AnonymousComment[]>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [inboxLink, setInboxLink] = useState<AnonymousInboxLink | null>(null);
  const [inboxThreads, setInboxThreads] = useState<AnonymousInboxThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadIsMine, setThreadIsMine] = useState(false);
  const [messages, setMessages] = useState<AnonymousInboxMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [incomingToken, setIncomingToken] = useState('');
  const [incomingPostId, setIncomingPostId] = useState('');
  const [incomingPromptEnabled, setIncomingPromptEnabled] = useState<boolean | null>(null);
  const [identitySetupRequested, setIdentitySetupRequested] = useState(false);
  const [shareScope, setShareScope] = useState<AnonymousScope>('all_nigerian_schools');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const scope: AnonymousScope = feedTab === 'for_you' ? 'school' : 'all_nigerian_schools';
  const feedSort: FeedSort = feedTab === 'trending' ? 'trending' : feedTab === 'hot' ? 'hot' : 'new';

  const api = useCallback(<T,>(path: string, method = 'GET', value?: unknown) => {
    return apiRequest<T>(path, {
      token,
      method,
      ...(value === undefined ? {} : { body: JSON.stringify(value) }),
    });
  }, [token]);

  const loadPosts = useCallback(async () => {
    if (incomingPostId) {
      const [schoolPosts, allPosts] = await Promise.all([
        api<AnonymousPost[]>(`/anonymous/posts?scope=school&id=${incomingPostId}`),
        api<AnonymousPost[]>(`/anonymous/posts?scope=all_nigerian_schools&id=${incomingPostId}`),
      ]);
      setPosts([...schoolPosts, ...allPosts]);
      return;
    }
    const result = await api<AnonymousPost[]>(`/anonymous/posts?scope=${scope}`);
    setPosts(result);
  }, [api, incomingPostId, scope]);

  const loadInbox = useCallback(async () => {
    const [link, threads] = await Promise.all([
      api<AnonymousInboxLink | null>('/anonymous/inbox/link'),
      api<AnonymousInboxThread[]>('/anonymous/inbox'),
    ]);
    setInboxLink(link);
    setInboxThreads(threads);
  }, [api]);

  const loadMessages = useCallback(async (threadId: string) => {
    const result = await api<AnonymousInboxMessage[]>(`/anonymous/inbox/threads/${threadId}`);
    setMessages(result);
  }, [api]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const accessToken = await getAnonymousAccessToken();
        if (!active) return;
        setToken(accessToken);
        const result = await apiRequest<AnonymousIdentity | null>('/anonymous/identity', { token: accessToken });
        if (active) {
          setIdentity(result);
          if (result) setSuggestedHandle(result.handle);
        }
      } catch (loadError) {
        const msg = messageFor(loadError);
        if (active && !msg.toLowerCase().includes('sign in')) {
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const match = url.match(/(?:\/|:\/\/)anonymous\/inbox\/([a-f0-9]{32,})/i);
      if (match) {
        setIncomingToken(match[1]);
        setView('inbox');
        setMeTab('inbox');
        setSelectedThread(null);
        setIncomingPromptEnabled(null);
        return;
      }
      const postMatch = url.match(/(?:\/|:\/\/)anonymous\/posts\/([a-f0-9-]{36})/i);
      if (postMatch) {
        setIncomingPostId(postMatch[1]);
        setView('feed');
        setSelectedThread(null);
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadPosts().catch((loadError: unknown) => setError(messageFor(loadError)));
  }, [loadPosts, token]);

  useEffect(() => {
    if (!identity || !token || view !== 'inbox' || meTab !== 'inbox' || incomingToken) return;
    void loadInbox().catch((loadError: unknown) => setError(messageFor(loadError)));
  }, [identity, incomingToken, loadInbox, meTab, token, view]);

  useEffect(() => {
    if (!token || !incomingToken) return;
    void api<{ enabled: boolean }>(`/anonymous/inbox/links/${incomingToken}`)
      .then((prompt) => setIncomingPromptEnabled(prompt.enabled))
      .catch((loadError: unknown) => {
        setIncomingPromptEnabled(false);
        setError(messageFor(loadError));
      });
  }, [api, incomingToken, token]);

  const requestIdentity = () => {
    setIdentitySetupRequested(true);
    setNotice('');
  };

  const handleSave = async () => {
    setBusy(true);
    setError('');
    const chosenHandle = suggestedHandle.trim() || `Ghost ${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const result = await api<AnonymousIdentity>('/anonymous/identity', 'POST', { handle: chosenHandle });
      setIdentity(result);
      setIdentitySetupRequested(false);
      setNotice(`You're in as ${result.handle}.`);
    } catch (saveError) {
      setError(messageFor(saveError));
    } finally {
      setBusy(false);
    }
  };

  const publishPost = async () => {
    if (!identity) {
      requestIdentity();
      return;
    }
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try {
      const postTitle = title.trim() || body.trim().split(/\s+/).slice(0, 8).join(' ').slice(0, 120);
      const post = await api<AnonymousPost>('/anonymous/posts', 'POST', { title: postTitle, body: body.trim(), scope });
      setPosts((current) => [post, ...current]);
      setTitle('');
      setBody('');
      setComposerOpen(false);
      setNotice('Your post is live in the Anonymous Feed.');
    } catch (publishError) {
      setError(messageFor(publishError));
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async (post: AnonymousPost) => {
    if (!identity) {
      requestIdentity();
      return;
    }
    try {
      const result = await api<{ liked: boolean; likes_count: number }>(`/anonymous/posts/${post.id}/like`, 'POST');
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, liked_by_me: result.liked, likes_count: result.likes_count }
        : item));
    } catch (likeError) {
      setError(messageFor(likeError));
    }
  };

  const toggleComments = async (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    try {
      const result = await api<AnonymousComment[]>(`/anonymous/posts/${postId}/comments`);
      setCommentsByPost((current) => ({ ...current, [postId]: result }));
    } catch (commentsError) {
      setError(messageFor(commentsError));
    }
  };

  const submitComment = async (postId: string) => {
    if (!identity) {
      requestIdentity();
      return;
    }
    const value = commentDrafts[postId]?.trim();
    if (!value) return;
    try {
      const comment = await api<AnonymousComment>(`/anonymous/posts/${postId}/comments`, 'POST', { body: value });
      setCommentsByPost((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, comments_count: post.comments_count + 1 }
        : post));
    } catch (commentError) {
      setError(messageFor(commentError));
    }
  };

  const reportContent = (targetKind: 'post' | 'comment' | 'message', targetId: string) => {
    Alert.alert('Report this content?', 'Our safety team will review it. The author will not see who reported it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => {
          void api('/anonymous/reports', 'POST', {
            targetKind,
            targetId,
            reason: 'Harassment or content that may violate community guidelines',
          }).then(() => setNotice('Report submitted for review.'))
            .catch((reportError: unknown) => setError(messageFor(reportError)));
        },
      },
    ]);
  };

  const sharePublicPost = async (post: AnonymousPost) => {
    try {
      const url = `${webBaseUrl()}/anonymous/posts/${post.id}`;
      await Share.share({ message: `${post.title}\n\n${post.body}\n\nJoin the conversation: ${url}`, url });
    } catch (shareError) {
      setError(messageFor(shareError));
    }
  };

  const copyPersonalLink = async () => {
    const readyLink = await ensureInboxLink();
    if (!readyLink) return;
    const url = `${webBaseUrl()}/anonymous/inbox/${readyLink.token}`;
    try {
      await Clipboard.setStringAsync(url);
      setNotice('Your personal Anonymous link was copied.');
    } catch (copyError) {
      setError(messageFor(copyError));
    }
  };

  const sharePersonalLink = async () => {
    const readyLink = await ensureInboxLink();
    if (!readyLink) return;
    const url = `${webBaseUrl()}/anonymous/inbox/${readyLink.token}`;
    try {
      await Share.share({ message: `${templateText.trim() || 'Send me an anonymous message'}\n\n${url}`, url });
    } catch (shareError) {
      setError(messageFor(shareError));
    }
  };

  const ensureInboxLink = async () => {
    if (inboxLink) return inboxLink;
    if (!identity) {
      requestIdentity();
      return null;
    }
    setBusy(true);
    try {
      const link = await api<AnonymousInboxLink>('/anonymous/inbox/link', 'POST');
      setInboxLink(link);
      setNotice('Your anonymous link is ready.');
      return link;
    } catch (linkError) {
      setError(messageFor(linkError));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createInboxLink = async () => {
    const link = await ensureInboxLink();
    if (link) await loadInbox();
  };

  const selectTemplate = (templateId: string) => {
    const template = inboxTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(template.id);
    setTemplateText(template.prompt);
    setIsEditingTemplate(false);
  };

  const toggleInboxLink = async () => {
    if (!inboxLink) return;
    try {
      const result = await api<{ enabled: boolean }>('/anonymous/inbox/link', 'PATCH', { enabled: !inboxLink.enabled });
      setInboxLink({ ...inboxLink, enabled: result.enabled });
      setNotice(result.enabled ? 'Your link is active again.' : 'Your link is paused. New messages are blocked.');
    } catch (linkError) {
      setError(messageFor(linkError));
    }
  };

  const openThread = async (threadId: string) => {
    setSelectedThread(threadId);
    setThreadIsMine(true);
    setIncomingToken('');
    setError('');
    try {
      await loadMessages(threadId);
    } catch (threadError) {
      setError(messageFor(threadError));
    }
  };

  const sendInboxMessage = async () => {
    if (!identity) {
      requestIdentity();
      return;
    }
    const value = messageDraft.trim();
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      if (incomingToken && !selectedThread) {
        const result = await api<{ thread_id: string }>(`/anonymous/inbox/links/${incomingToken}/messages`, 'POST', { body: value });
        setSelectedThread(result.thread_id);
        setThreadIsMine(false);
        setIncomingToken('');
        setIncomingPromptEnabled(null);
        setMessageDraft('');
        await loadMessages(result.thread_id);
        setNotice('Your anonymous message was sent. Replies stay in this private thread.');
      } else if (selectedThread) {
        const result = await api<AnonymousInboxMessage>(`/anonymous/inbox/threads/${selectedThread}`, 'POST', { body: value });
        setMessages((current) => [...current, result]);
        setMessageDraft('');
      }
    } catch (sendError) {
      setError(messageFor(sendError));
    } finally {
      setBusy(false);
    }
  };

  const blockThread = () => {
    if (!selectedThread) return;
    Alert.alert('Block this conversation?', 'This will stop further messages and hide the conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          void api(`/anonymous/inbox/threads/${selectedThread}/block`, 'POST')
            .then(() => {
              setSelectedThread(null);
              setMessages([]);
              setIncomingToken('');
              setNotice('This conversation has been blocked.');
              void loadInbox();
            })
            .catch((blockError: unknown) => setError(messageFor(blockError)));
        },
      },
    ]);
  };

  const shareInboxMessage = (message: AnonymousInboxMessage) => {
    if (!selectedThread) return;
    Alert.alert(
      'Share this message to the public Feed?',
      `Only this message will be posted. The preview will show:\n\n“${message.body}”\n\nThe original private thread will remain private.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share to Feed',
          onPress: () => {
            void api<AnonymousPost>(`/anonymous/inbox/threads/${selectedThread}/share`, 'POST', {
              messageId: message.id,
              scope: shareScope,
            }).then((post) => {
              setPosts((current) => [post as AnonymousPost, ...current]);
              setNotice('Only the selected message was shared as a new public post.');
            }).catch((shareError: unknown) => setError(messageFor(shareError)));
          },
        },
      ],
    );
  };

  const displayScope = useMemo(() => scope === 'school' ? 'For You' : 'General', [scope]);
  const rankedPosts = useMemo(() => rankPosts(posts, feedSort), [feedSort, posts]);

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#1d9bf0" />
        <Text style={styles.loadingText}>Opening Anonymous…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#000', paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to Room" accessibilityRole="button" onPress={onBack} style={styles.headerBack}>
            <ArrowLeft color="#f4f5f8" size={20} />
          </Pressable>
        </View>

        {error && !(identitySetupRequested && !identity) ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

        <View accessibilityRole="tablist" style={styles.viewSwitcher}>
          <TabButton
            icon={<MessageCircle color={view === 'feed' ? '#f4f5f8' : '#8a8d91'} size={13} />}
            label="Feed"
            active={view === 'feed'}
            onPress={() => { setView('feed'); setIncomingToken(''); setIncomingPostId(''); setSelectedThread(null); }}
          />
          <TabButton
            icon={<IconSymbol name="Shield" framed={false} size={13} />}
            label="ME"
            active={view === 'inbox'}
            onPress={() => { setView('inbox'); setMeTab('try_these'); setSelectedThread(null); }}
          />
        </View>

        {view === 'feed' ? (
              <>
                <View style={styles.discoveryRow}>
                  <TabButton label="For You" active={feedTab === 'for_you'} onPress={() => setFeedTab('for_you')} expanded />
                  <TabButton label="General" active={feedTab === 'general'} onPress={() => setFeedTab('general')} expanded />
                  <TabButton label="Hot" active={feedTab === 'hot'} onPress={() => setFeedTab('hot')} expanded />
                  <TabButton label="Trending" active={feedTab === 'trending'} onPress={() => setFeedTab('trending')} expanded />
                  {identity ? <Pressable accessibilityRole="button" onPress={() => setComposerOpen((open) => !open)} style={styles.writeButton}><Text style={styles.writeButtonText}>{composerOpen ? 'Close' : '+ Write'}</Text></Pressable> : null}
                </View>
                {identity && composerOpen ? (
                  <View style={styles.feedComposer}>
                    <View style={styles.composerInputRow}>
                      <Pencil color="#7c8495" size={16} />
                      <TextInput
                        accessibilityLabel="Write an anonymous message"
                        autoFocus
                        maxLength={3000}
                        multiline
                        onChangeText={setBody}
                        placeholder="Write an anonymous message…"
                        placeholderTextColor="#858b98"
                        style={styles.composerMessage}
                        value={body}
                      />
                      <Pressable accessibilityRole="button" disabled={busy || !body.trim()} onPress={() => void publishPost()} style={[styles.composerPostButton, (!body.trim() || busy) && styles.composerPostDisabled]}>
                        {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.composerPostText}>Post</Text>}
                      </Pressable>
                    </View>
                    <ScrollView horizontal contentContainerStyle={styles.composerTemplates} showsHorizontalScrollIndicator={false}>
                      {inboxTemplates.map((template) => (
                        <Pressable key={template.id} accessibilityRole="button" onPress={() => setBody(template.prompt)} style={styles.composerTemplate}>
                          <LinearGradient colors={template.colors} style={styles.composerTemplateGradient}>
                            <Text numberOfLines={1} style={styles.composerTemplateText}>{templateTitles[template.id]}</Text>
                          </LinearGradient>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Text style={styles.composerMentionHint}>Use @handle to mention someone · Visible to {displayScope}</Text>
                  </View>
                ) : !identity && !identitySetupRequested ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Join the conversation</Text>
                    <Text style={styles.helper}>Choose an Anonymous name when you’re ready to post or reply.</Text>
                    <Button label="Set name" onPress={requestIdentity} small />
                  </View>
                ) : null}

                <View style={styles.feed}>
                  {rankedPosts.length ? rankedPosts.map((post) => (
                    <View key={post.id} style={styles.postCard}>
                      <View style={styles.postMeta}>
                        <View style={styles.mask}><IconSymbol name="Shield" framed={false} size={11} /></View>
                        <View style={styles.postMetaText}>
                          <Text style={styles.author}>{post.author_handle}</Text>
                          <Text style={styles.meta}>{post.scope === 'school' ? 'For You' : 'General'} · {relativeTime(post.created_at)}</Text>
                        </View>
                        <Pressable accessibilityLabel="Report anonymous post" onPress={() => reportContent('post', post.id)} style={styles.iconAction}>
                          <Text style={styles.iconActionText}>•••</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postBody}>{post.body}</Text>
                      <View style={styles.postActions}>
                        <Pressable accessibilityRole="button" onPress={() => void toggleLike(post)} style={styles.actionButton}>
                          <Text style={[styles.actionText, post.liked_by_me && styles.actionActive]}>{post.liked_by_me ? '♥' : '♡'} {post.likes_count}</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => void toggleComments(post.id)} style={styles.actionButton}>
                          <Text style={styles.actionText}>◌ {post.comments_count} comments</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => void sharePublicPost(post)} style={styles.actionButton}>
                          <Text style={styles.actionText}>Share</Text>
                        </Pressable>
                        {post.is_mine ? <Pressable accessibilityRole="button" onPress={() => {
                          Alert.alert('Delete this post?', 'This cannot be undone.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => {
                              void api(`/anonymous/posts/${post.id}`, 'DELETE')
                                .then(() => setPosts((current) => current.filter((item) => item.id !== post.id)))
                                .catch((deleteError: unknown) => setError(messageFor(deleteError)));
                            } },
                          ]);
                        }} style={styles.actionButton}><Text style={styles.actionText}>Delete</Text></Pressable> : null}
                      </View>
                      {openComments === post.id ? (
                        <View style={styles.commentsPanel}>
                          {(commentsByPost[post.id] ?? []).map((comment) => (
                            <View key={comment.id} style={styles.commentRow}>
                              <View style={styles.commentText}>
                                <Text style={styles.commentAuthor}>{comment.author_handle}</Text>
                                <Text style={styles.commentBody}>{comment.body}</Text>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setCommentDrafts((current) => ({
                                    ...current,
                                    [post.id]: `@${comment.author_handle} `,
                                  }))}
                                  style={styles.replyCommentButton}
                                ><Text style={styles.replyCommentText}>Reply</Text></Pressable>
                              </View>
                              <Pressable accessibilityLabel="Report comment" onPress={() => reportContent('comment', comment.id)}><Text style={styles.reportText}>Report</Text></Pressable>
                            </View>
                          ))}
                          {(() => {
                            const draft = commentDrafts[post.id] ?? '';
                            const match = draft.match(/@([A-Za-z0-9_.-]*)$/);
                            if (!match) return null;
                            const handles = Array.from(new Set([
                              ...posts.map((item) => item.author_handle),
                              ...(commentsByPost[post.id] ?? []).map((item) => item.author_handle),
                            ])).filter((handle) => handle.toLowerCase().includes(match[1].toLowerCase())).slice(0, 5);
                            if (!handles.length) return null;
                            return (
                              <View style={styles.mentionSuggestions}>
                                {handles.map((handle) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    key={handle}
                                    onPress={() => {
                                      const mentionStart = draft.lastIndexOf('@');
                                      setCommentDrafts((current) => ({
                                        ...current,
                                        [post.id]: `${draft.slice(0, mentionStart)}@${handle} `,
                                      }));
                                    }}
                                    style={styles.mentionSuggestion}
                                  ><Text style={styles.mentionSuggestionText}>@{handle}</Text></Pressable>
                                ))}
                              </View>
                            );
                          })()}
                          <View style={styles.replyRow}>
                            <TextInput
                              accessibilityLabel="Write an anonymous comment"
                              maxLength={2000}
                              onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
                              onSubmitEditing={() => void submitComment(post.id)}
                              placeholder="Add an anonymous comment…"
                              placeholderTextColor="#71767b"
                              style={[styles.input, styles.commentInput]}
                              value={commentDrafts[post.id] ?? ''}
                            />
                            <Pressable accessibilityRole="button" onPress={() => void submitComment(post.id)}><Text style={styles.sendLabel}>Send</Text></Pressable>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.helper}>Be the first to start a conversation in {displayScope}.</Text></View>}
                </View>
              </>
            ) : (
              <View style={styles.inbox}>
                <View accessibilityRole="tablist" style={styles.meTabRow}>
                  <TabButton label="Try these" active={meTab === 'try_these'} onPress={() => setMeTab('try_these')} compact />
                  <TabButton label="Inbox" active={meTab === 'inbox'} onPress={() => { setMeTab('inbox'); setSelectedThread(null); }} compact />
                </View>
                {meTab === 'try_these' ? (
                  <View style={styles.tryThese}>
                    <ScrollView horizontal contentContainerStyle={styles.templateRail} showsHorizontalScrollIndicator={false}>
                      {inboxTemplates.map((template) => (
                        <View accessibilityState={{ selected: selectedTemplateId === template.id }} key={template.id} style={[styles.templateCard, selectedTemplateId === template.id && styles.templateCardSelected, { height: Math.min(Dimensions.get('window').height * 0.58, 700), width: Dimensions.get('window').width * 0.76 }]}>
                          <LinearGradient colors={template.colors} style={styles.templateBanner}>
                            {(() => {
                              const Illustration = templateIllustrations[template.id];
                              return (
                                <Pressable accessibilityLabel={`Select ${templateTitles[template.id]} prompt`} accessibilityRole="button" onPress={() => selectTemplate(template.id)} style={styles.templateArt}>
                                  <Illustration color="#292d3b" size={30} strokeWidth={2.2} />
                                </Pressable>
                              );
                            })()}
                            <View style={styles.templateTitleRow}>
                              {editingTemplateTitleId === template.id ? (
                                <TextInput
                                  accessibilityLabel="Edit template title"
                                  autoFocus
                                  maxLength={40}
                                  onBlur={() => setEditingTemplateTitleId(null)}
                                  onChangeText={(value) => setTemplateTitles((current) => ({ ...current, [template.id]: value }))}
                                  onSubmitEditing={() => setEditingTemplateTitleId(null)}
                                  returnKeyType="done"
                                  selectTextOnFocus
                                  style={styles.templateNameInput}
                                  value={templateTitles[template.id]}
                                />
                              ) : (
                                <Pressable accessibilityRole="button" onPress={() => selectTemplate(template.id)}>
                                  <Text style={styles.templateName}>{templateTitles[template.id]}</Text>
                                </Pressable>
                              )}
                              <Pressable accessibilityLabel={`Edit ${templateTitles[template.id]} title`} accessibilityRole="button" onPress={() => setEditingTemplateTitleId(template.id)} style={styles.templateTitleEdit}>
                                <Pencil color="#fff" size={11} />
                              </Pressable>
                            </View>
                          </LinearGradient>
                          <View style={styles.templatePromptWrap}>
                            {isEditingTemplate && selectedTemplateId === template.id ? (
                              <TextInput
                                accessibilityLabel="Edit your anonymous message prompt"
                                autoFocus
                                maxLength={180}
                                multiline
                                onChangeText={setTemplateText}
                                onBlur={() => setIsEditingTemplate(false)}
                                style={[styles.templatePrompt, styles.templatePromptInput]}
                                value={templateText}
                              />
                            ) : (
                              <Text style={styles.templatePrompt}>{selectedTemplateId === template.id ? templateText : template.prompt}</Text>
                            )}
                            <Pressable
                              accessibilityLabel={isEditingTemplate && selectedTemplateId === template.id ? 'Finish editing prompt' : 'Edit prompt'}
                              accessibilityRole="button"
                              onPress={() => {
                                if (selectedTemplateId === template.id) {
                                  setIsEditingTemplate((editing) => !editing);
                                } else {
                                  selectTemplate(template.id);
                                  setIsEditingTemplate(true);
                                }
                              }}
                              style={styles.templateEdit}
                            ><Pencil color="#fff" size={14} /></Pressable>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                    <View style={styles.shareSteps}>
                      <View style={styles.shareStep}>
                        <View style={styles.shareStepHeading}>
                          <Text style={styles.shareStepNumber}>1</Text>
                          <Text style={styles.shareStepTitle}>Step 1: <Text style={styles.shareStepHighlight}>Copy your link</Text></Text>
                        </View>
                      {inboxLink ? <Text selectable style={styles.linkText}>{webBaseUrl()}/anonymous/inbox/{inboxLink.token}</Text> : null}
                        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void copyPersonalLink()} style={styles.copyLinkButton}>
                          <Link2 color="#ed49ca" size={13} />
                          <Text style={styles.shareButtonText}>{busy ? 'Preparing…' : 'Copy link'}</Text>
                          <Copy color="#aebfe8" size={13} />
                        </Pressable>
                      </View>
                      <View style={styles.shareStep}>
                        <View style={styles.shareStepHeading}>
                          <Text style={styles.shareStepNumber}>2</Text>
                          <Text style={styles.shareStepTitle}>Step 2: <Text style={styles.shareStepHighlight}>Share link</Text> on your story</Text>
                        </View>
                        <View style={styles.shareAction}>
                          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shareRays}>
                            <View style={styles.shareRayTop} /><View style={styles.shareRayMiddle} /><View style={styles.shareRayBottom} />
                          </View>
                          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sharePersonalLink()} style={styles.shareButtonWrap}>
                            <LinearGradient colors={['#13b6ef', '#7935e9']} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.shareButton}>
                              <Send color="#fff" size={13} /><Text style={styles.shareButtonText}>Share!</Text>
                            </LinearGradient>
                          </Pressable>
                          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.shareRays, styles.shareRaysRight]}>
                            <View style={styles.shareRayTop} /><View style={styles.shareRayMiddle} /><View style={styles.shareRayBottom} />
                          </View>
                        </View>
                      </View>
                      {inboxLink ? (
                        <Pressable accessibilityRole="switch" accessibilityState={{ checked: inboxLink.enabled }} onPress={() => void toggleInboxLink()} style={styles.linkToggle}>
                          <Text style={styles.helperLight}>{inboxLink.enabled ? 'Link active · Pause new messages' : 'Link paused · Resume messages'}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : incomingToken ? (
                  <>
                    <Pressable accessibilityRole="button" onPress={() => { setIncomingToken(''); setIncomingPromptEnabled(null); }} style={styles.backButton}>
                      <Text style={styles.backText}>‹  Back to Inbox</Text>
                    </Pressable>
                    <Text style={styles.sectionTitle}>A message for you</Text>
                    {incomingPromptEnabled === false ? (
                      <View style={styles.emptyCard}><Text style={styles.emptyTitle}>This link is unavailable</Text><Text style={styles.helper}>The owner paused their anonymous link or it is no longer valid.</Text></View>
                    ) : (
                      <View style={styles.messageCard}>
                        <Text style={styles.helperLight}>YOUR MESSAGE IS PRIVATE</Text>
                        <Text style={styles.messageTitle}>Send something honest, kind, or fun.</Text>
                        <TextInput
                          accessibilityLabel="Write an anonymous message"
                          maxLength={2000}
                          multiline
                          onChangeText={setMessageDraft}
                          placeholder="Write a message…"
                          placeholderTextColor="#71767b"
                          style={[styles.input, styles.bodyInput]}
                          value={messageDraft}
                        />
                        <Button label="Send anonymously" onPress={() => void sendInboxMessage()} busy={busy} />
                      </View>
                    )}
                  </>
                ) : selectedThread ? (
                  <>
                    <Pressable accessibilityRole="button" onPress={() => { setSelectedThread(null); setMessages([]); void loadInbox(); }} style={styles.backButton}>
                      <Text style={styles.backText}>‹  Back to Inbox</Text>
                    </Pressable>
                    <View style={styles.threadHeading}>
                      <View><Text style={styles.sectionTitle}>Private conversation</Text><Text style={styles.helper}>The other person is always shown as Anonymous.</Text></View>
                      <Pressable accessibilityRole="button" onPress={blockThread}><Text style={styles.reportText}>Block</Text></Pressable>
                    </View>
                    <View style={styles.messageList}>
                      {messages.map((message) => (
                        <View key={message.id} style={[styles.messageBubble, message.is_mine ? styles.mineBubble : styles.theirBubble]}>
                          <Text style={styles.helperLight}>{message.is_mine ? 'You' : 'Anonymous'} · {relativeTime(message.created_at)}</Text>
                          <Text style={styles.messageBody}>{message.body}</Text>
                          {threadIsMine ? (
                            <View style={styles.messageActions}>
                              <Pressable accessibilityRole="button" onPress={() => shareInboxMessage(message)}><Text style={styles.shareMessage}>Preview & share to Feed</Text></Pressable>
                              <Pressable accessibilityRole="button" onPress={() => reportContent('message', message.id)}><Text style={styles.reportText}>Report</Text></Pressable>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                    {threadIsMine ? (
                      <View style={styles.scopeRow}>
                        <TabButton label="For You" active={shareScope === 'school'} onPress={() => setShareScope('school')} compact />
                        <TabButton label="General" active={shareScope === 'all_nigerian_schools'} onPress={() => setShareScope('all_nigerian_schools')} compact />
                      </View>
                    ) : null}
                    <View style={styles.replyRow}>
                      <TextInput
                        accessibilityLabel="Reply privately"
                        maxLength={2000}
                        multiline
                        onChangeText={setMessageDraft}
                        placeholder="Reply privately…"
                        placeholderTextColor="#71767b"
                        style={[styles.input, styles.commentInput]}
                        value={messageDraft}
                      />
                      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendInboxMessage()} style={styles.sendButton}>
                        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendLabel}>Send</Text>}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.inboxHeading}>Inbox</Text>
                    {inboxThreads.length ? inboxThreads.map((thread) => (
                      <Pressable accessibilityRole="button" key={thread.id} onPress={() => void openThread(thread.id)} style={styles.threadCard}>
                        <View style={styles.mask}><IconSymbol name="Shield" framed={false} size={11} /></View>
                        <View style={styles.threadText}>
                          <Text style={styles.author}>Anonymous</Text>
                          <Text numberOfLines={2} style={styles.threadPreview}>{thread.last_message ?? 'Start a private conversation'}</Text>
                        </View>
                        <Text style={styles.meta}>{thread.message_count} · {thread.last_message_at ? relativeTime(thread.last_message_at) : ''}</Text>
                      </Pressable>
                    )) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Your Inbox is quiet</Text><Text style={styles.helper}>When someone uses your personal link, their message will appear here as Anonymous.</Text></View>}
                  </>
                )}
              </View>
            )}
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => {}}
        statusBarTranslucent
        transparent
        visible={!loading && identitySetupRequested && !identity}
      >
        <View style={styles.identityModalBackdrop}>
          <View accessibilityViewIsModal style={styles.identityModal}>
            <Pressable accessibilityLabel="Close anonymous name setup" accessibilityRole="button" onPress={() => { setIdentitySetupRequested(false); setError(''); }} style={styles.identityModalClose}>
              <Text style={styles.identityModalCloseText}>×</Text>
            </Pressable>
            <Text style={styles.identityTitle}>Choose your Anonymous name</Text>
            <Text style={styles.identityHelper}>This will be your anonymous identity. No one can know who you are—not even us.</Text>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <TextInput
              accessibilityLabel="Anonymous name"
              autoCapitalize="words"
              maxLength={24}
              onChangeText={setSuggestedHandle}
              onSubmitEditing={() => void handleSave()}
              placeholder="e.g. Ghost 3606"
              placeholderTextColor="#71767b"
              returnKeyType="done"
              style={[styles.input, styles.identityInput]}
              value={suggestedHandle}
            />
            <Button label="Continue" onPress={() => void handleSave()} busy={busy} small />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Button({ label, onPress, busy = false, small = false, secondary = false }: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  small?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[buttonStyles.button, small && buttonStyles.small, secondary && buttonStyles.secondary]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={buttonStyles.text}>{label}</Text>}
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: '#1d9bf0', borderRadius: 18, justifyContent: 'center', minHeight: 34, paddingHorizontal: 12 },
  small: { minHeight: 28, paddingHorizontal: 9 },
  secondary: { backgroundColor: '#16181a', borderColor: '#2f3336', borderWidth: 1 },
  text: { color: '#fff', fontSize: 11, fontWeight: '500' },
});

function TabButton({ label, active, onPress, compact = false, expanded = false, icon }: { label: string; active: boolean; onPress: () => void; compact?: boolean; expanded?: boolean; icon?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[tabStyles.tab, compact && tabStyles.compact, expanded && tabStyles.expanded, active && tabStyles.active]}>
      <View style={tabStyles.content}>
        {icon}
        <Text style={[tabStyles.label, active && tabStyles.activeLabel]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  tab: { alignItems: 'center', backgroundColor: 'transparent', borderColor: 'transparent', borderBottomColor: 'transparent', borderBottomWidth: 2, borderRadius: 0, borderWidth: 0, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  compact: { flex: 1, minHeight: 38, paddingHorizontal: 0 },
  expanded: { flex: 1, minWidth: 0, paddingHorizontal: 1 },
  active: { borderBottomColor: '#fff' },
  content: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  label: { color: '#8a8d91', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  activeLabel: { color: '#fff' },
});

const createStyles = () => StyleSheet.create({
  screen: { backgroundColor: '#000', flex: 1 },
  content: { paddingBottom: 90 },
  header: { borderBottomColor: '#202124', borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 50, paddingHorizontal: 14, paddingVertical: 5 },
  headerBack: { alignItems: 'center', backgroundColor: '#17191c', borderColor: '#303236', borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  loadingScreen: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center' },
  loadingText: { color: '#8a8d91', fontSize: 12 },
  hero: { borderRadius: 28, marginHorizontal: 16, marginTop: 9, overflow: 'hidden', padding: 20 },
  eyebrow: { color: '#f8d4ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '900', lineHeight: 32, marginTop: 12 },
  heroCopy: { color: '#f3dcf4', fontSize: 12, lineHeight: 18, marginTop: 9, maxWidth: 300 },
  identityBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 14, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 7 },
  viewSwitcher: { borderBottomColor: '#26282a', borderBottomWidth: 1, flexDirection: 'row', gap: 0, marginHorizontal: 14, marginTop: 2 },
  meTabRow: { borderBottomColor: '#26282a', borderBottomWidth: 1, flexDirection: 'row', marginHorizontal: -4 },
  tryThese: { gap: 10, paddingTop: 8 },
  templateRail: { gap: 10, paddingVertical: 5, paddingRight: 14 },
  templateCard: { backgroundColor: '#101522', borderColor: '#282f40', borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  templateCardSelected: { borderColor: '#8094ff' },
  templateBanner: { alignItems: 'center', height: '38%', justifyContent: 'center', gap: 8, padding: 16 },
  templateArt: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 40, height: 58, justifyContent: 'center', width: 58 },
  templateTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', maxWidth: '100%' },
  templateTitleEdit: { alignItems: 'center', backgroundColor: 'rgba(23,27,41,0.32)', borderColor: 'rgba(255,255,255,0.38)', borderRadius: 12, borderWidth: 1, height: 21, justifyContent: 'center', width: 21 },
  templateName: { color: '#fff', fontSize: 21, fontWeight: '700', lineHeight: 24, textAlign: 'center' },
  templateNameInput: { color: '#fff', fontSize: 21, fontWeight: '700', minWidth: 70, padding: 0, textAlign: 'center' },
  templatePromptWrap: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 22, position: 'relative' },
  templatePrompt: { color: '#f5f6fa', fontSize: 22, fontWeight: '600', lineHeight: 30, textAlign: 'center' },
  templatePromptInput: { padding: 0, textAlignVertical: 'center', width: '100%' },
  templateEdit: { alignItems: 'center', backgroundColor: 'rgba(23,27,41,0.82)', borderColor: 'rgba(255,255,255,0.32)', borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', position: 'absolute', right: 12, top: 12, width: 36 },
  shareSteps: { alignSelf: 'center', backgroundColor: '#101a35', borderColor: '#343f65', borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 2, maxWidth: 300, paddingHorizontal: 12, paddingVertical: 9, width: '100%' },
  shareStep: { alignItems: 'center', gap: 6, width: '100%' },
  shareStepHeading: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  shareStepNumber: { backgroundColor: '#6250f2', borderRadius: 10, color: '#fff', fontSize: 10, height: 19, lineHeight: 19, overflow: 'hidden', textAlign: 'center', width: 19 },
  shareStepTitle: { color: '#dce4ff', fontSize: 11, fontWeight: '400' },
  shareStepHighlight: { color: '#9a5cff', fontWeight: '500' },
  copyLinkButton: { alignItems: 'center', alignSelf: 'center', borderColor: '#7161ec', borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 28, paddingHorizontal: 12, paddingVertical: 4 },
  shareButtonText: { color: '#fff', fontSize: 12, fontWeight: '400' },
  shareAction: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', width: '100%' },
  shareButtonWrap: { alignSelf: 'center', borderRadius: 22, overflow: 'hidden' },
  shareButton: { alignItems: 'center', borderRadius: 22, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 30, paddingHorizontal: 14, paddingVertical: 5 },
  shareRays: { alignItems: 'center', height: 30, justifyContent: 'center', position: 'relative', width: 14 },
  shareRaysRight: { transform: [{ scaleX: -1 }] },
  shareRayTop: { backgroundColor: '#7546ff', borderRadius: 3, height: 3, left: 2, position: 'absolute', top: 4, transform: [{ rotate: '45deg' }], width: 9 },
  shareRayMiddle: { backgroundColor: '#248ffc', borderRadius: 3, height: 3, position: 'absolute', width: 12 },
  shareRayBottom: { backgroundColor: '#7546ff', borderRadius: 3, bottom: 4, height: 3, left: 2, position: 'absolute', transform: [{ rotate: '-45deg' }], width: 9 },
  templateEditor: { backgroundColor: '#101522', borderColor: '#343e58', borderRadius: 12, borderWidth: 1, color: '#f4f5f8', fontSize: 12, minHeight: 50, paddingHorizontal: 10, paddingVertical: 9, textAlign: 'center' },
  inboxHeading: { color: '#f4f5f8', fontSize: 16, fontWeight: '600', paddingVertical: 3 },
  scopeRow: { flexDirection: 'row', gap: 0, marginHorizontal: 12, marginTop: 4 },
  discoveryRow: { alignItems: 'center', borderBottomColor: '#26282a', borderBottomWidth: 1, flexDirection: 'row', gap: 3, marginHorizontal: 14, marginTop: 3 },
  writeButton: { alignItems: 'center', backgroundColor: '#1d9bf0', borderRadius: 20, justifyContent: 'center', marginLeft: 4, minHeight: 30, minWidth: 52, paddingHorizontal: 10 },
  writeButtonText: { color: '#fff', fontSize: 10, fontWeight: '500' },
  composer: { backgroundColor: '#080808', borderColor: '#2f3336', borderRadius: 14, borderWidth: 1, gap: 9, marginHorizontal: 14, marginTop: 10, padding: 12 },
  feedComposer: { backgroundColor: '#080808', borderColor: '#2f3336', borderRadius: 14, borderWidth: 1, gap: 9, marginHorizontal: 8, marginTop: 8, paddingHorizontal: 10, paddingVertical: 9 },
  composerInputRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  composerMessage: { color: '#e7e9ea', flex: 1, fontSize: 12, maxHeight: 100, minHeight: 36, paddingHorizontal: 0, paddingVertical: 8, textAlignVertical: 'center' },
  composerPostButton: { alignItems: 'center', backgroundColor: '#1d9bf0', borderRadius: 18, justifyContent: 'center', minHeight: 32, paddingHorizontal: 12 },
  composerPostDisabled: { opacity: 0.45 },
  composerPostText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  composerTemplates: { gap: 6, paddingRight: 8 },
  composerTemplate: { borderRadius: 12, overflow: 'hidden' },
  composerTemplateGradient: { borderRadius: 12, maxWidth: 120, paddingHorizontal: 9, paddingVertical: 6 },
  composerTemplateText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  composerMentionHint: { color: '#71767b', fontSize: 9 },
  composerHeading: { color: '#e7e9ea', fontSize: 12, fontWeight: '500' },
  input: { backgroundColor: '#101214', borderColor: '#2f3336', borderRadius: 12, borderWidth: 1, color: '#e7e9ea', fontSize: 13, paddingHorizontal: 12, paddingVertical: 11 },
  bodyInput: { minHeight: 88, textAlignVertical: 'top' },
  composerFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  helper: { color: '#8a8d91', fontSize: 11, lineHeight: 16 },
  helperLight: { color: '#8a8d91', fontSize: 10, lineHeight: 15 },
  feed: { gap: 9, paddingHorizontal: 9, paddingTop: 8 },
  postCard: { backgroundColor: '#08090b', borderColor: '#202328', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 12 },
  postMeta: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  mask: { alignItems: 'center', backgroundColor: '#0b766e', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  postMetaText: { flex: 1 },
  author: { color: '#e7e9ea', fontSize: 11, fontWeight: '500' },
  meta: { color: '#71767b', fontSize: 9 },
  iconAction: { padding: 8 },
  iconActionText: { color: '#8a8d91', fontSize: 15, fontWeight: '900' },
  postTitle: { color: '#e7e9ea', fontSize: 14, fontWeight: '500', lineHeight: 19, marginTop: 8 },
  postBody: { color: '#e7e9ea', fontSize: 13, lineHeight: 19, marginTop: 2 },
  postActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 4 },
  actionButton: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7 },
  actionText: { color: '#8a8d91', fontSize: 10, fontWeight: '400' },
  actionActive: { color: '#f91880' },
  commentsPanel: { borderTopColor: '#26282a', borderTopWidth: 1, gap: 10, marginTop: 9, paddingTop: 12 },
  commentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  commentText: { flex: 1 },
  replyCommentButton: { alignSelf: 'flex-start', marginTop: 3, paddingVertical: 2 },
  replyCommentText: { color: '#1d9bf0', fontSize: 9, fontWeight: '500' },
  mentionSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  mentionSuggestion: { backgroundColor: '#101522', borderColor: '#343e58', borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  mentionSuggestionText: { color: '#9bbcff', fontSize: 10 },
  commentAuthor: { color: '#e7e9ea', fontSize: 10, fontWeight: '500' },
  commentBody: { color: '#b0b3b8', fontSize: 11, lineHeight: 16, marginTop: 3 },
  reportText: { color: '#1d9bf0', fontSize: 10, fontWeight: '500', padding: 4 },
  replyRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
  commentInput: { flex: 1, maxHeight: 85, minHeight: 42, paddingVertical: 10 },
  sendLabel: { color: '#1d9bf0', fontSize: 11, fontWeight: '500', padding: 6 },
  emptyCard: { backgroundColor: '#080808', borderColor: '#26282a', borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 12, padding: 10 },
  emptyTitle: { color: '#e7e9ea', fontSize: 12, fontWeight: '500' },
  identityModalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 18 },
  identityModal: { alignItems: 'center', backgroundColor: '#080808', borderColor: '#2f3336', borderRadius: 14, borderWidth: 1, gap: 7, maxWidth: 360, padding: 12, position: 'relative', width: '100%' },
  identityModalClose: { alignItems: 'center', height: 28, justifyContent: 'center', position: 'absolute', right: 5, top: 3, width: 28, zIndex: 1 },
  identityModalCloseText: { color: '#8a8d91', fontSize: 22, lineHeight: 25 },
  identityTitle: { color: '#e7e9ea', fontSize: 13, fontWeight: '500' },
  identityHelper: { color: '#8a8d91', fontSize: 10, lineHeight: 13, textAlign: 'center' },
  identityFormRow: { alignItems: 'center', gap: 7, width: '100%' },
  identityInput: { height: 32, paddingHorizontal: 9, paddingVertical: 5, width: '100%' },
  sectionTitle: { color: '#e7e9ea', fontSize: 14, fontWeight: '500' },
  error: { backgroundColor: '#2b1117', borderRadius: 12, color: '#ffb8c2', fontSize: 11, marginHorizontal: 14, marginTop: 10, padding: 11 },
  notice: { backgroundColor: '#0b2527', borderRadius: 12, color: '#a6f3ed', fontSize: 11, marginHorizontal: 14, marginTop: 10, padding: 11 },
  inbox: { gap: 12, paddingHorizontal: 16, paddingTop: 15 },
  linkCard: { backgroundColor: '#080808', borderColor: '#26282a', borderRadius: 14, borderWidth: 1, gap: 10, padding: 13 },
  linkText: { color: '#e7e9ea', fontSize: 10, lineHeight: 16 },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkToggle: { alignSelf: 'flex-start', paddingVertical: 5 },
  threadCard: { alignItems: 'center', backgroundColor: '#000', borderBottomColor: '#26282a', borderBottomWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  threadText: { flex: 1, gap: 3 },
  threadPreview: { color: '#b0b3b8', fontSize: 11, lineHeight: 15 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 7 },
  backText: { color: '#1d9bf0', fontSize: 11, fontWeight: '500' },
  messageCard: { backgroundColor: '#080808', borderColor: '#26282a', borderRadius: 14, borderWidth: 1, gap: 11, padding: 13 },
  messageTitle: { color: '#e7e9ea', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  threadHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  messageList: { gap: 10 },
  messageBubble: { backgroundColor: '#101214', borderColor: '#26282a', borderRadius: 14, borderWidth: 1, maxWidth: '92%', padding: 12 },
  mineBubble: { alignSelf: 'flex-end', backgroundColor: '#0b3350' },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#101214' },
  messageBody: { color: '#e7e9ea', fontSize: 13, lineHeight: 19, marginTop: 6 },
  messageActions: { borderTopColor: '#26282a', borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 8 },
  shareMessage: { color: '#1d9bf0', fontSize: 10, fontWeight: '500' },
  sendButton: { alignItems: 'center', backgroundColor: '#1d9bf0', borderRadius: 20, justifyContent: 'center', minHeight: 38, minWidth: 58 },
});
