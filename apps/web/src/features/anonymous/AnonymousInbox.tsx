'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnonAvatar } from '@/components/cr/Avatars';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { ErrorBlock, FeedSkeleton, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { Toggle } from '@/components/cr/primitives';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { ShareSheet } from '@/components/cr/ShareSheet';
import { useToast } from '@/components/cr/Toast';
import { useAppSession } from '@/features/app/AppSession';
import { dayLabel, shortAge } from '@/lib/format';
import { isCardTheme, type CardTheme } from '@/features/share/card';
import { anonRequest, inboxLinkUrl, type AnonIdentity, type InboxLink, type InboxMessage, type InboxThread } from './api';
import { AnonymousNameSheet } from './AnonymousNameSheet';
import { PromptPickerSheet } from './PromptPickerSheet';
import { DEFAULT_PROMPT } from './prompt-templates';
import './prompt.css';

const DAY_MS = 24 * 60 * 60 * 1000;

function useInboxLink() {
  const { session: account } = useAppSession();
  const toast = useToast();
  const [link, setLink] = useState<InboxLink | null>(null);
  const [busy, setBusy] = useState(false);

  const create = useCallback(async () => {
    if (!account) return null;
    setBusy(true);
    try {
      const created = await anonRequest<InboxLink>(account, '/inbox/link', 'POST');
      setLink(created);
      return created;
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Your link could not be created.', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }, [account, toast]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!account || !link) return;
    setBusy(true);
    setLink({ ...link, enabled });
    try {
      const result = await anonRequest<{ enabled: boolean }>(account, '/inbox/link', 'PATCH', { enabled });
      setLink((current) => (current ? { ...current, enabled: result.enabled } : current));
      toast.show(result.enabled ? 'Accepting messages' : 'Link paused');
    } catch (error) {
      setLink((current) => (current ? { ...current, enabled: !enabled } : current));
      toast.show(error instanceof Error ? error.message : 'Your link setting could not be saved.', 'error');
    } finally {
      setBusy(false);
    }
  }, [account, link, toast]);

  const copy = useCallback(async (target: InboxLink) => {
    try {
      await navigator.clipboard.writeText(inboxLinkUrl(target.token));
      toast.show('Link copied');
    } catch {
      toast.show('Couldn’t copy. Press and hold the link to copy it.', 'error');
    }
  }, [toast]);

  // Sharing opens the share sheet: copy, WhatsApp, X, Facebook, Telegram and a story card with the link line.
  const [shareFor, setShareFor] = useState<InboxLink | null>(null);
  const share = useCallback((target: InboxLink) => setShareFor(target), []);
  const shareSheet = (
    <ShareSheet
      card={{ text: shareFor?.prompt || DEFAULT_PROMPT, kicker: 'Ask me anything', theme: isCardTheme(shareFor?.prompt_theme) ? shareFor.prompt_theme : 'blue-hour' }}
      onClose={() => setShareFor(null)}
      open={Boolean(shareFor)}
      text={shareFor?.prompt || DEFAULT_PROMPT}
      title="Share your link"
      url={shareFor ? inboxLinkUrl(shareFor.token) : ''}
    />
  );

  const savePrompt = useCallback(async (prompt: string, theme: CardTheme) => {
    if (!account) throw new Error('Sign in again to save your prompt.');
    const saved = await anonRequest<{ prompt: string | null; theme: string | null }>(account, '/inbox/link', 'PATCH', { prompt, theme });
    setLink((current) => (current ? { ...current, prompt: saved.prompt, prompt_theme: saved.theme } : current));
  }, [account]);

  return { link, setLink, busy, create, setEnabled, copy, share, shareSheet, savePrompt };
}

/** "Inbox and link" screen and mockup 74 (empty). */
export function AnonymousInbox() {
  const router = useRouter();
  const { session: account, ready, requireAccount } = useAppSession();
  const { link, setLink, busy, create, setEnabled, copy, share, shareSheet, savePrompt } = useInboxLink();
  const [promptOpen, setPromptOpen] = useState(false);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [sent, setSent] = useState<InboxThread[]>([]);
  // When the list was fetched. Used to split New vs Earlier; read here, never during render.
  const [loadedAt, setLoadedAt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [identity, setIdentity] = useState<AnonIdentity | null | undefined>(undefined);
  const [nameSheet, setNameSheet] = useState(false);

  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      requireAccount('sign-in');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [currentLink, currentThreads, currentIdentity] = await Promise.all([
          anonRequest<InboxLink | null>(account, '/inbox/link'),
          anonRequest<InboxThread[]>(account, '/inbox'),
          anonRequest<AnonIdentity | null>(account, '/identity'),
        ]);
        // Conversations you started (so you can read replies). A failure here just hides the section.
        const sentThreads = await anonRequest<InboxThread[]>(account, '/inbox/sent').catch(() => [] as InboxThread[]);
        if (!active) return;
        setLink(currentLink);
        setThreads(currentThreads);
        setSent(sentThreads);
        setLoadedAt(Date.now());
        setIdentity(currentIdentity);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, ready, requireAccount, setLink]);

  const ensureLink = async () => {
    if (link) return link;
    if (!identity) {
      setNameSheet(true);
      return null;
    }
    return create();
  };

  const recent = threads.filter((thread) => thread.last_message_at && loadedAt - new Date(thread.last_message_at).getTime() < DAY_MS);
  const earlier = threads.filter((thread) => !recent.includes(thread));

  const row = (thread: InboxThread) => (
    <button className="cr-row-btn" key={thread.id} onClick={() => router.push(`/anonymous/inbox/thread/${thread.id}`)} type="button">
      <AnonAvatar />
      <span className="cr-row-btn__main">
        <span className="cr-row-btn__title">Anonymous</span>
        <span className="cr-row-btn__sub">{thread.last_message ?? 'Private conversation'}</span>
      </span>
      <span className="cr-row-btn__meta">
        <span>{thread.last_message_at ? shortAge(thread.last_message_at) : ''}</span>
        {thread.message_count > 1 ? <span>{thread.message_count} messages</span> : null}
      </span>
    </button>
  );

  return (
    <main className="cr-screen cr-anon-inbox">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/anonymous')} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow">
          <h1 className="cr-hd__t">Inbox</h1>
          <p className="cr-hd__sub">Only you can see these messages.</p>
        </div>
        <button aria-label="Link settings" className="cr-icon-btn" onClick={() => router.push('/anonymous/link')} type="button"><Icon name="cog" /></button>
      </header>

      {status === 'loading' ? <FeedSkeleton count={3} label="Loading Inbox" media={false} /> : null}
      {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t load your Inbox" /> : null}

      {status === 'ready' ? (
        <>
          <section aria-label="Your message link" className="cr-linkcard">
            <p className="cr-linkcard__label">Your message link</p>
            {link ? (
              <>
                <p className="cr-linkcard__url">{inboxLinkUrl(link.token).replace(/^https?:\/\//, '')}</p>
                <div className="cr-linkcard__row">
                  <button className="cr-linkcard__btn cr-linkcard__btn--light" onClick={() => void copy(link)} type="button"><Icon name="copy" />Copy</button>
                  <button className="cr-linkcard__btn" onClick={() => void share(link)} type="button"><Icon name="up" />Share</button>
                  <span className="cr-linkcard__toggle">
                    <span>{link.enabled ? 'Active' : 'Paused'}</span>
                    <Toggle className="cr-toggle--light" label="Accept messages" on={link.enabled} onChange={busy ? undefined : (value) => void setEnabled(value)} />
                  </span>
                </div>
                <p className="cr-linkcard__hint" style={{ textAlign: 'center' }}>“{link.prompt || DEFAULT_PROMPT}”</p>
                <button className="cr-linkcard__btn cr-linkcard__btn--light" onClick={() => setPromptOpen(true)} type="button">Change prompt</button>
              </>
            ) : (
              <>
                <p className="cr-linkcard__hint">Create a link people can use to message you anonymously.</p>
                <button className="cr-linkcard__btn cr-linkcard__btn--light" disabled={busy} onClick={() => void ensureLink()} type="button">{busy ? 'Creating…' : 'Create my link'}</button>
              </>
            )}
          </section>

          {threads.length === 0 && sent.length === 0 ? (
            <StateBlock
              actions={<button className="cr-pbtn cr-pbtn--l" disabled={busy} onClick={() => void ensureLink().then((ready) => { if (ready) void share(ready); })} type="button">Share my link</button>}
              description="Share your link to start getting anonymous messages."
              icon="send"
              title="No messages yet"
            />
          ) : (
            <>
              {recent.length ? <><p className="cr-section-label">New</p>{recent.map(row)}</> : null}
              {earlier.length ? <><p className="cr-section-label">Earlier</p>{earlier.map(row)}</> : null}
            </>
          )}
          {sent.length ? (
            <>
              <p className="cr-section-label">Messages you sent</p>
              {sent.map((thread) => (
                <button className="cr-row-btn" key={thread.id} onClick={() => router.push(`/anonymous/inbox/thread/${thread.id}?from=sent`)} type="button">
                  <AnonAvatar />
                  <span className="cr-row-btn__main">
                    <span className="cr-row-btn__title">Your anonymous message</span>
                    <span className="cr-row-btn__sub">{thread.last_message ?? 'Private conversation'}</span>
                  </span>
                  <span className="cr-row-btn__meta">
                    <span>{thread.last_message_at ? shortAge(thread.last_message_at) : ''}</span>
                    {thread.message_count > 1 ? <span>{thread.message_count} messages</span> : null}
                  </span>
                </button>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {shareSheet}
      <PromptPickerSheet
        initialPrompt={link?.prompt ?? ''}
        initialTheme={link?.prompt_theme ?? null}
        onClose={() => setPromptOpen(false)}
        onSave={async (prompt, theme) => { await savePrompt(prompt, theme); setPromptOpen(false); }}
        open={promptOpen}
      />
      <AnonymousNameSheet
        onClose={() => setNameSheet(false)}
        onSaved={(saved) => {
          setIdentity(saved);
          setNameSheet(false);
          void create();
        }}
        open={nameSheet}
      />
    </main>
  );
}

/** Mockup 53. Regenerating needs a server endpoint that does not exist yet, so the row is disabled. */
export function AnonymousLinkSettings() {
  const router = useRouter();
  const { session: account, ready, requireAccount } = useAppSession();
  const { link, setLink, busy, setEnabled, copy, share, shareSheet } = useInboxLink();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      requireAccount('sign-in');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const current = await anonRequest<InboxLink | null>(account, '/inbox/link');
        if (!active) return;
        setLink(current);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, ready, requireAccount, setLink]);

  return (
    <main className="cr-screen">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/anonymous/inbox')} type="button"><Icon name="back" /></button>
        <h1 className="cr-hd__t">Anonymous link</h1>
        <span className="cr-hd__spacer" />
      </header>
      {status === 'loading' ? <FeedSkeleton count={1} label="Loading link" media={false} /> : null}
      {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t load your link" /> : null}
      {status === 'ready' && !link ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => router.push('/anonymous/inbox')} type="button">Go to Inbox</button>} description="Create your link from the Inbox first." icon="link" title="No link yet" />
      ) : null}
      {status === 'ready' && link ? (
        <>
          <div className="cr-urlbox">
            <span>{inboxLinkUrl(link.token).replace(/^https?:\/\//, '')}</span>
            <button aria-label="Copy link" className="cr-icon-btn" onClick={() => void copy(link)} type="button"><Icon name="copy" /></button>
          </div>
          <div className="cr-btnrow">
            <button className="cr-ghost cr-ghost--l" onClick={() => void share(link)} type="button"><Icon name="up" />Share</button>
            <button className="cr-ghost cr-ghost--l" onClick={() => void copy(link)} type="button"><Icon name="copy" />Copy</button>
          </div>
          <div className="cr-setrow">
            <div className="cr-setrow__main"><span>Accept messages</span><small>Turn off to pause new messages</small></div>
            <Toggle label="Accept messages" on={link.enabled} onChange={busy ? undefined : (value) => void setEnabled(value)} />
          </div>
          <div aria-disabled="true" className="cr-setrow cr-setrow--disabled">
            <Icon name="refresh" />
            <div className="cr-setrow__main"><span>Regenerate link</span><small>Coming soon. Old link stops working.</small></div>
            <Icon name="rt" />
          </div>
          <p className="cr-inf cr-inf--bottom">Regenerating gives you a new link. Messages already in your Inbox are kept.</p>
        </>
      ) : null}
      {shareSheet}
    </main>
  );
}

/** Mockups 16 and 17: a private anonymous conversation. */
export function AnonymousThread({ threadId }: { threadId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { session: account, ready, requireAccount } = useAppSession();
  // Opened from "Messages you sent": you are the sender, so the owner-only tools (reply publicly, share) stay hidden.
  const fromSent = useSearchParams().get('from') === 'sent';
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [shareMessage, setShareMessage] = useState<InboxMessage | null>(null);
  const [sharing, setSharing] = useState(false);
  const [replyFor, setReplyFor] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyCard, setReplyCard] = useState<{ question: string; answer: string; url: string } | null>(null);
  const [reportMessage, setReportMessage] = useState<InboxMessage | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      requireAccount('sign-in');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const loaded = await anonRequest<InboxMessage[]>(account, `/inbox/threads/${threadId}`);
        if (!active) return;
        setMessages(loaded);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, ready, requireAccount, threadId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !account || sending) return;
    setSending(true);
    try {
      const created = await anonRequest<InboxMessage>(account, `/inbox/threads/${threadId}`, 'POST', { body });
      setMessages((list) => [...list, created]);
      setDraft('');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Your reply could not be sent.', 'error');
    } finally {
      setSending(false);
    }
  };

  const confirmShare = async () => {
    if (!shareMessage || !account) return;
    setSharing(true);
    try {
      await anonRequest(account, `/inbox/threads/${threadId}/share`, 'POST', { messageId: shareMessage.id, scope: 'all_nigerian_schools' });
      setShareMessage(null);
      toast.show('Shared to the Anonymous feed');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'The message could not be shared.', 'error');
    } finally {
      setSharing(false);
    }
  };

  const confirmBlock = async () => {
    if (!account) return;
    setBlocking(true);
    try {
      await anonRequest(account, `/inbox/threads/${threadId}/block`, 'POST');
      toast.show('Conversation blocked');
      router.push('/anonymous/inbox');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'This conversation could not be blocked.', 'error');
      setBlocking(false);
    }
  };

  // Builds the card from the message and your answer. The card links to your own link, so people who see it can message you.
  const makeReplyCard = async () => {
    if (!replyFor || !account || !replyText.trim()) return;
    let url = `${window.location.origin}/anonymous`;
    try {
      const own = await anonRequest<InboxLink | null>(account, '/inbox/link');
      if (own) url = inboxLinkUrl(own.token);
    } catch { /* the card still works, it just points at the app */ }
    setReplyCard({ question: replyFor.body, answer: replyText.trim(), url });
    setReplyFor(null);
  };

  let lastDay = '';

  return (
    <main className="cr-screen cr-screen--nonav cr-thread">
      <header className="cr-hd cr-thread__hd">
        <button aria-label="Back to Inbox" className="cr-icon-btn" onClick={() => router.push('/anonymous/inbox')} type="button"><Icon name="back" /></button>
        <AnonAvatar />
        <div className="cr-hd__grow">
          <h1 className="cr-hd__t">Anonymous</h1>
          <p className="cr-hd__sub">Only you can see this.</p>
        </div>
        <button aria-label="Block this conversation" className="cr-icon-btn" onClick={() => setBlockOpen(true)} type="button"><Icon name="blk" /></button>
      </header>

      <div className="cr-thread__list">
        {status === 'loading' ? <FeedSkeleton count={2} label="Loading conversation" media={false} /> : null}
        {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t open this conversation" /> : null}
        {status === 'ready' ? messages.map((message) => {
          const day = dayLabel(message.created_at);
          const separator = day !== lastDay ? <p className="cr-tm" key={`${message.id}-day`}>{day}</p> : null;
          lastDay = day;
          return (
            <div key={message.id}>
              {separator}
              <div className={message.is_mine ? 'cr-bub cr-bub--me' : 'cr-bub'}>
                <p>{message.body}</p>
              </div>
              {!message.is_mine ? (
                <div className="cr-bub__tools">
                  {fromSent ? null : <button className="cr-link" onClick={() => { setReplyText(''); setReplyFor(message); }} type="button">Reply publicly</button>}
                  {fromSent ? null : <button className="cr-link" onClick={() => setShareMessage(message)} type="button">Share publicly</button>}
                  <button className="cr-link cr-link--muted" onClick={() => setReportMessage(message)} type="button">Report</button>
                </div>
              ) : null}
            </div>
          );
        }) : null}
        <div ref={bottom} />
      </div>

      <form className="cr-thread__composer" onSubmit={(event) => void send(event)}>
        <div className="cr-input cr-input--pill">
          <input aria-label="Reply privately" disabled={status !== 'ready'} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="Reply privately…" value={draft} />
        </div>
        <button aria-label="Send reply" className="cr-icon-btn" disabled={!draft.trim() || sending} type="submit"><Icon name="send" /></button>
      </form>

      <BottomSheet context="Inbox" onClose={() => setShareMessage(null)} open={Boolean(shareMessage)} title="Share this message publicly?">
        <div className="cr-pv"><AnonAvatar size="s" /><p>{shareMessage?.body}</p></div>
        <p className="cr-note">It will appear in the Anonymous feed. Your name and the sender’s identity are not shown. Nothing else from your Inbox is shared.</p>
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setShareMessage(null)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={sharing} onClick={() => void confirmShare()} type="button">{sharing ? 'Sharing…' : 'Share'}</button>
        </div>
      </BottomSheet>

      <BottomSheet context="Inbox" description="Your answer goes on a card with their message. Nobody sees who sent it." onClose={() => setReplyFor(null)} open={Boolean(replyFor)} title="Reply publicly">
        <div className="cr-pv"><AnonAvatar size="s" /><p>{replyFor?.body}</p></div>
        <textarea aria-label="Your public answer" className="cr-textarea" maxLength={200} onChange={(event) => setReplyText(event.target.value)} placeholder="Your answer…" rows={3} value={replyText} />
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setReplyFor(null)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={!replyText.trim()} onClick={() => void makeReplyCard()} type="button">Make my card</button>
        </div>
      </BottomSheet>

      <ShareSheet
        card={replyCard ? { text: replyCard.answer, question: replyCard.question, kicker: 'Anonymous message', theme: 'rose-note' } : undefined}
        onClose={() => setReplyCard(null)}
        open={Boolean(replyCard)}
        text={replyCard ? `“${replyCard.question}” — my answer 👇` : ''}
        title="Share your reply"
        url={replyCard?.url ?? ''}
      />

      <ReportSheet
        context="Inbox"
        onClose={() => setReportMessage(null)}
        onSubmit={async (reason, details) => {
          if (!reportMessage || !account) return;
          await anonRequest(account, '/reports', 'POST', { targetKind: 'message', targetId: reportMessage.id, reason: details ? `${reason}: ${details}` : reason });
          setReportMessage(null);
          toast.show('Report sent');
        }}
        open={Boolean(reportMessage)}
        subject="message"
      />

      <BottomSheet description="They won’t be able to message you from this conversation again. They aren’t told." onClose={() => setBlockOpen(false)} open={blockOpen} title="Block this conversation?">
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setBlockOpen(false)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l cr-pbtn--danger" disabled={blocking} onClick={() => void confirmBlock()} type="button">{blocking ? 'Blocking…' : 'Block'}</button>
        </div>
      </BottomSheet>
    </main>
  );
}
