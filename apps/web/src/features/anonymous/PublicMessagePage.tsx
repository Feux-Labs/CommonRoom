'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/cr/Icon';
import { useAppSession } from '@/features/app/AppSession';
import { AnonymousApiError, anonRequest, type AnonIdentity } from './api';

type PageState = 'loading' | 'ready' | 'sending' | 'failed' | 'sent' | 'rate_limited' | 'off' | 'invalid' | 'unavailable';

const MAX_LENGTH = 500;
const PROMPTS = [
  { label: 'Ask me anything', text: 'Something I’ve always wanted to ask you: ' },
  { label: 'Tell me a secret', text: 'A secret: ' },
  { label: 'Compliment', text: 'Honestly, I think you ' },
];

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

/**
 * Logged-out visitor page for /anonymous/inbox/[token] (mockups 20–25).
 * The owner's name is never requested or shown, so invalid and paused links
 * reveal nothing about who owns them.
 */
export function PublicMessagePage({ token }: { token: string }) {
  const { session, ready, ensureAdult } = useAppSession();
  const [pageState, setState] = useState<PageState>('loading');
  // Without a session nothing can load, so that is derived rather than synced in an effect.
  const state: PageState = ready && !session ? 'unavailable' : pageState;
  const [draft, setDraft] = useState('');

  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setState('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready || !session) return;
    let active = true;
    void (async () => {
      try {
        const prompt = await anonRequest<{ enabled: boolean }>(session, `/inbox/links/${encodeURIComponent(token)}`);
        if (active) setState(prompt.enabled ? 'ready' : 'off');
      } catch (error) {
        if (!active) return;
        if (error instanceof AnonymousApiError && error.status === 404) setState('invalid');
        else setState('unavailable');
      }
    })();
    return () => { active = false; };
  }, [attempt, ready, session, token]);

  /** Visitors need an identity row to send; create a private one silently. Never displayed. */
  const ensureIdentity = async () => {
    const existing = await anonRequest<AnonIdentity | null>(session, '/identity');
    if (existing) return;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await anonRequest<AnonIdentity>(session, '/identity', 'POST', { handle: `Visitor ${Math.floor(100000 + Math.random() * 900000)}` });
        return;
      } catch (error) {
        if (!(error instanceof AnonymousApiError && error.code === 'anonymous_handle_taken')) throw error;
      }
    }
    throw new Error('Could not start an anonymous session.');
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !session || state === 'sending') return;
    if (!ensureAdult(() => void deliver(body))) return;
    await deliver(body);
  };

  const deliver = async (body: string) => {
    if (!session) return;
    setState('sending');
    try {
      await ensureIdentity();
      await anonRequest(session, `/inbox/links/${encodeURIComponent(token)}/messages`, 'POST', { body });
      setDraft('');
      setState('sent');
    } catch (error) {
      if (error instanceof AnonymousApiError && error.status === 429) setState('rate_limited');
      else if (error instanceof AnonymousApiError && error.code === 'anonymous_inbox_link_unavailable') setState('off');
      else setState('failed');
    }
  };

  const showComposer = state === 'ready' || state === 'sending' || state === 'failed';

  return (
    <main className="cr-web">
      <div className={showComposer ? 'cr-web__top' : 'cr-web__top cr-web__top--short'}>
        <div className="cr-web__brand"><span aria-hidden="true" className="cr-brand-dots cr-brand-dots--light"><i /><i /><i /></span>common room</div>
        {showComposer ? (
          <>
            <div aria-hidden="true" className="cr-web__sq"><Icon name="anon" /></div>
            <h1 className="cr-web__title">Send an anonymous message</h1>
            <p className="cr-web__sub">They won’t see who you are. No account needed.</p>
          </>
        ) : null}
      </div>

      {state === 'loading' ? (
        <div aria-busy="true" className="cr-web__card" role="status">
          <i className="cr-sk" style={{ height: 104, borderRadius: 14 }} />
          <i className="cr-sk" style={{ width: 120, height: 32, borderRadius: 12, margin: '12px 0 0 auto' }} />
        </div>
      ) : null}

      {showComposer ? (
        <>
          <form className="cr-web__card" noValidate onSubmit={(event) => void send(event)}>
            {state === 'failed' ? (
              <div className="cr-banner banner" role="alert">Couldn’t send your message. Check your connection and try again. Your message is still here.</div>
            ) : null}
            <label className="cr-label cr-web__label" htmlFor="cr-web-message">Your message</label>
            <textarea
              className="cr-textarea"
              disabled={state === 'sending'}
              id="cr-web-message"
              maxLength={MAX_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Say something honest…"
              rows={4}
              value={draft}
            />
            <div className="cr-sp cr-web__count">
              <span className="cr-cnt">{state === 'failed' ? '' : 'Need a prompt?'}</span>
              <span className="cr-cnt">{draft.length} / {MAX_LENGTH}</span>
            </div>
            {state !== 'failed' ? (
              <div className="cr-web__prompts">
                {PROMPTS.map((prompt) => (
                  <button className="cr-ghost" disabled={state === 'sending'} key={prompt.label} onClick={() => setDraft((current) => (current.trim() ? current : prompt.text))} type="button">{prompt.label}</button>
                ))}
              </div>
            ) : null}
            <div className="cr-web__submit">
              <button aria-busy={state === 'sending' || undefined} className="cr-pbtn cr-pbtn--l" disabled={!draft.trim() || state === 'sending'} type="submit">
                {state === 'sending' ? <><span aria-hidden="true" className="cr-spinner" />Sending…</> : state === 'failed' ? 'Try again' : <>Send anonymously <Icon name="arr" /></>}
              </button>
            </div>
          </form>
          <p className="cr-web__privacy"><Icon name="lock" /><span>Your identity is never shared. Messages are private, and the person you’re messaging chooses whether to share anything publicly.</span></p>
        </>
      ) : null}

      {state === 'sent' ? (
        <Result
          actions={<>
            <button className="cr-ghost cr-ghost--l" onClick={() => setState('ready')} type="button">Send another</button>
            <Link className="cr-pbtn cr-pbtn--l" href="/anonymous">Get your own link</Link>
          </>}
          description="They won’t see who you are."
          icon="chk"
          title="Message sent"
        />
      ) : null}
      {state === 'rate_limited' ? <Result description="You sent a few messages in a short time. Try again later." icon="clk" title="Too many messages" /> : null}
      {state === 'off' ? <Result description="This person isn’t taking anonymous messages right now. Try again later." icon="pause" title="This link is turned off" /> : null}
      {state === 'invalid' ? <Result description="It may have been replaced or removed. Ask for a new link." icon="cx" title="This link isn’t valid" /> : null}
      {state === 'unavailable' ? (
        <Result
          actions={<button className="cr-pbtn cr-pbtn--l" onClick={retry} type="button">Try again</button>}
          description="Check your connection and try again."
          icon="warn"
          title="Couldn’t open this link"
        />
      ) : null}

      <footer className="cr-web__foot">
        {SUPPORT_EMAIL ? <a className="cr-link cr-link--muted" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Report abuse: anonymous link')}&body=${encodeURIComponent(`Link: ${typeof window === 'undefined' ? '' : window.location.href}`)}`}>Report abuse</a> : <span />}
        <Link className="cr-link" href="/anonymous">Get your own link</Link>
      </footer>
    </main>
  );
}

function Result({ icon, title, description, actions }: { icon: IconName; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <section className="cr-web__card cr-web__result" role="status">
      <span aria-hidden="true" className="cr-stateblock__icon"><Icon name={icon} /></span>
      <h1 className="cr-web__result-title">{title}</h1>
      <p className="cr-web__result-sub">{description}</p>
      <div className="cr-stateblock__actions">{actions ?? <Link className="cr-pbtn cr-pbtn--l" href="/anonymous">Get your own link</Link>}</div>
    </section>
  );
}
