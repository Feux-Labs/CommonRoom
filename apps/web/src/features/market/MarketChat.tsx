'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/cr/Avatars';
import { StateBlock } from '@/components/cr/FeedStates';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { Icon } from '@/components/cr/Icon';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { formatNaira, shortAge } from '@/lib/format';
import { useHydrated } from '@/lib/use-hydrated';
import '@/styles/market-chat.css';

export type ThreadSummary = {
  id: string;
  listing_title: string;
  listing_status: string;
  other_name: string;
  other_avatar: string | null;
  i_am_seller: boolean;
  last_message: string | null;
  last_message_at: string;
  last_from_me: boolean | null;
  unread: boolean;
};

type Message = { id: string; mine: boolean; body: string; createdAt: string };
type ThreadHeader = {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_status: string;
  listing_price: number;
  other_name: string;
  other_avatar: string | null;
  i_am_seller: boolean;
  can_reply: boolean;
};
type ThreadDetail = { thread: ThreadHeader; messages: Message[]; hasMore: boolean };

const POLL_MS = 6000;
const MAX_LENGTH = 1000;

/** Your marketplace conversations. */
export function MarketInbox() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    void (async () => {
      try {
        const list = await apiRequest<ThreadSummary[]>('/api/v1/market/threads', { session: account });
        if (!active) return;
        setThreads(list);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, [account, ready, attempt]);

  return (
    <main className="cr-screen">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/marketplace')} type="button"><Icon name="back" /></button>
        <h1 className="cr-hd__t">Messages</h1>
        <span className="cr-hd__spacer" />
      </header>
      {!ready ? null : !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to message buyers and sellers." icon="cmt" title="Your messages" />
      ) : failed ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="Messages didn’t load" />
      ) : threads === null ? (
        <p className="cr-chat__note">Loading…</p>
      ) : threads.length === 0 ? (
        <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/marketplace">Browse the market</Link>} description="When you message a seller, or a buyer messages you, it shows up here." icon="cmt" title="No messages yet" />
      ) : (
        <ul className="cr-chat__list">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link className={thread.unread ? 'cr-chat__row is-unread' : 'cr-chat__row'} href={`/marketplace/messages/${thread.id}`}>
                <UserAvatar name={thread.other_name} size="m" src={thread.other_avatar} />
                <span className="cr-chat__main">
                  <span className="cr-chat__top">
                    <b>{thread.other_name}</b>
                    <span className="cr-chat__age">{shortAge(thread.last_message_at)}</span>
                  </span>
                  <span className="cr-chat__item">{thread.i_am_seller ? 'Selling' : 'Buying'}: {thread.listing_title}{thread.listing_status !== 'available' ? ` · ${thread.listing_status}` : ''}</span>
                  <span className="cr-chat__last">{thread.last_message ? `${thread.last_from_me ? 'You: ' : ''}${thread.last_message}` : 'No messages yet'}</span>
                </span>
                {thread.unread ? <span aria-label="Unread" className="cr-chat__dot" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** One conversation: messages, a box to reply, and a note when the item is no longer available. */
export function MarketThreadScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { account, ready, requireAccount } = useAppSession();
  const hydrated = useHydrated();
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reportFor, setReportFor] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const merge = useCallback((incoming: Message[]) => {
    setDetail((current) => {
      if (!current) return current;
      const known = new Set(current.messages.map((message) => message.id));
      const fresh = incoming.filter((message) => !known.has(message.id));
      return fresh.length ? { ...current, messages: [...current.messages, ...fresh] } : current;
    });
  }, []);

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    const load = async (first: boolean) => {
      try {
        const next = await apiRequest<ThreadDetail>(`/api/v1/market/threads/${id}`, { session: account });
        if (!active) return;
        if (first) {
          setDetail(next);
          setState('ready');
        } else {
          merge(next.messages);
          setDetail((current) => (current ? { ...current, thread: next.thread } : current));
        }
      } catch (error) {
        if (!active || !first) return;
        setState(error instanceof Error && 'status' in error && (error as { status: number }).status === 404 ? 'missing' : 'error');
      }
    };
    void load(true);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(false); }, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [account, ready, id, attempt, merge]);

  const count = detail?.messages.length ?? 0;
  useEffect(() => {
    if (stickToBottom.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!account || !body || sending) return;
    setSending(true);
    try {
      const sent = await apiRequest<Message>(`/api/v1/market/threads/${id}/messages`, { session: account, method: 'POST', body: { body } });
      stickToBottom.current = true;
      merge([sent]);
      setDraft('');
    } catch (error) {
      toast.show(errorMessage(error, 'Your message could not be sent.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const header = detail?.thread;
  return (
    <main className="cr-screen cr-chat">
      <header className="cr-hd">
        <button aria-label="Back to messages" className="cr-icon-btn" onClick={() => router.push('/marketplace/messages')} type="button"><Icon name="back" /></button>
        <h1 className="cr-hd__t">{header?.other_name ?? 'Messages'}</h1>
        <span className="cr-hd__spacer" />
      </header>
      {!hydrated || !ready ? <p className="cr-chat__note">Loading…</p> : !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to read this conversation." icon="cmt" title="Your messages" />
      ) : state === 'missing' ? (
        <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/marketplace/messages">Back to messages</Link>} description="It may have been removed, or it isn’t yours." icon="warn" title="Conversation not found" />
      ) : state === 'error' ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => { setState('loading'); setAttempt((value) => value + 1); }} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="This conversation didn’t load" />
      ) : !detail || !header ? (
        <p className="cr-chat__note">Loading…</p>
      ) : (
        <>
          <Link className="cr-chat__listing" href={`/marketplace/${header.listing_id}`}>
            <span>{header.listing_title}</span>
            <b>{formatNaira(Number(header.listing_price))}</b>
          </Link>
          <div className="cr-chat__thread" onScroll={(event) => { const el = event.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
            {detail.messages.length === 0 ? <p className="cr-chat__note">Say hello. Meet in a public place on campus and check the item before you pay.</p> : null}
            {detail.messages.map((message) => (
              <div className={message.mine ? 'cr-chat__msg is-mine' : 'cr-chat__msg'} key={message.id}>
                <p>{message.body}</p>
                <span>{shortAge(message.createdAt)}</span>
                {message.mine ? null : <button aria-label="Report message" className="cr-chat__flag" onClick={() => setReportFor(message)} type="button"><Icon name="flag" /></button>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {header.can_reply ? (
            <form className="cr-chat__form" onSubmit={(event) => void send(event)}>
              <textarea aria-label="Message" maxLength={MAX_LENGTH} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" rows={1} value={draft} />
              <button aria-label="Send" className="cr-pbtn" disabled={sending || !draft.trim()} type="submit">{sending ? '…' : 'Send'}</button>
            </form>
          ) : (
            <p className="cr-chat__closed">This item is {header.listing_status === 'sold' ? 'sold' : 'no longer available'}, so the conversation is closed.</p>
          )}
        </>
      )}
      <ReportSheet
        context={reportFor?.body.slice(0, 80)}
        onClose={() => setReportFor(null)}
        onSubmit={async (reason, details) => {
          if (!account || !reportFor) return;
          await apiRequest('/api/v1/reports/market-message', { session: account, method: 'POST', body: { messageId: reportFor.id, reason: details ? `${reason}: ${details}` : reason } });
          toast.show('Report sent. Thank you.');
          setReportFor(null);
        }}
        open={reportFor !== null}
        subject="message"
      />
    </main>
  );
}
