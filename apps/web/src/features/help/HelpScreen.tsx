'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/cr/Icon';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import './help.css';

type Ticket = { id: string; kind: string; subject: string; status: string; updatedAt: string; messages: Array<{ author: 'user' | 'staff'; body: string; createdAt: string }> };

const KINDS = [['bug', 'Something is broken'], ['account', 'Account or sign-in'], ['payment', 'Payment or Pro'], ['abuse', 'Someone is abusing me or others'], ['other', 'Something else']] as const;

/** "Help": tell us about a problem and read our replies. Works for guests and Anonymous users too. */
export function HelpScreen() {
  const router = useRouter();
  const { session, ready } = useAppSession();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready || !session) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const list = await apiRequest<Ticket[]>('/api/v1/support', { session });
        if (active) setTickets(list);
      } catch {
        if (active) setTickets([]);
      }
    })();
    return () => { active = false; };
  }, [ready, session]);

  const reload = async () => {
    if (!session) return;
    try { setTickets(await apiRequest<Ticket[]>('/api/v1/support', { session })); } catch { /* keep what is shown */ }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/v1/support', { session, method: 'POST', body: { kind, subject, message, page: document.referrer ? new URL(document.referrer).pathname : '/' } });
      setSubject(''); setMessage(''); setSent(true);
      await reload();
    } catch (submitError) {
      setError(errorMessage(submitError, 'We could not send that. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const reply = async (ticket: Ticket) => {
    const body = (replies[ticket.id] ?? '').trim();
    if (!session || !body) return;
    try {
      await apiRequest(`/api/v1/support/${ticket.id}`, { session, method: 'POST', body: { body } });
      setReplies({ ...replies, [ticket.id]: '' });
      await reload();
    } catch (replyError) {
      setError(errorMessage(replyError, 'Your reply could not be sent.'));
    }
  };

  return (
    <main className="cr-screen cr-help">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Help</h1><p className="cr-hd__sub">Tell us what went wrong. A person reads every message.</p></div>
      </header>

      <form className="cr-help__form" onSubmit={(event) => void submit(event)}>
        <label>What is it about?
          <select aria-label="What is it about" onChange={(event) => setKind(event.target.value as typeof kind)} value={kind}>{KINDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </label>
        <label>Title<input aria-label="Title" maxLength={120} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. I can’t see my inbox" value={subject} /></label>
        <label>Tell us more<textarea aria-label="Describe the problem" maxLength={3000} onChange={(event) => setMessage(event.target.value)} placeholder="What happened? What did you expect?" rows={5} value={message} /></label>
        {error ? <p role="alert" style={{ color: '#b3261e' }}>{error}</p> : null}
        {sent ? <p role="status">Thanks. We got it and we’ll reply here. You don’t need an account to write to us.</p> : null}
        <button className="cr-pbtn cr-pbtn--l" disabled={busy || !subject.trim() || message.trim().length < 5} type="submit">{busy ? 'Sending…' : 'Send'}</button>
      </form>

      <h2 className="cr-help__h2">Your messages to us</h2>
      {tickets === null ? <p className="cr-empty-line" role="status">Loading…</p> : tickets.length === 0 ? <p className="cr-empty-line">Nothing yet.</p> : tickets.map((ticket) => (
        <article className="cr-help__ticket" key={ticket.id}>
          <div className="cr-help__top"><b>{ticket.subject}</b><span className={ticket.status === 'resolved' ? 'cr-help__chip cr-help__chip--done' : 'cr-help__chip'}>{ticket.status === 'resolved' ? 'Resolved' : 'Open'}</span></div>
          {ticket.messages.map((item, index) => (
            <p className={item.author === 'staff' ? 'cr-help__msg cr-help__msg--staff' : 'cr-help__msg'} key={index}><small>{item.author === 'staff' ? 'Common Room support' : 'You'} · {new Date(item.createdAt).toLocaleString()}</small>{item.body}</p>
          ))}
          <div className="cr-help__reply">
            <input aria-label={`Reply about ${ticket.subject}`} maxLength={3000} onChange={(event) => setReplies({ ...replies, [ticket.id]: event.target.value })} placeholder="Write back…" value={replies[ticket.id] ?? ''} />
            <button className="cr-ghost" disabled={!(replies[ticket.id] ?? '').trim()} onClick={() => void reply(ticket)} type="button">Send</button>
          </div>
        </article>
      ))}
    </main>
  );
}
