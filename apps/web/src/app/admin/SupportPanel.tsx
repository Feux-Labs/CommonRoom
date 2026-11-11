'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adminCall } from './adminApi';
import './admin-extra.css';

type Who = { userId: string | null; guest: boolean; email: string | null; name: string | null; anonymousId: string | null };
type Ticket = { id: string; kind: string; subject: string; status: string; updatedAt: string; who: Who; messages: number; lastAuthor: string | null; preview: string | null };
type Detail = {
  id: string; kind: string; subject: string; status: string; createdAt: string; context: { page?: string | null; userAgent?: string };
  person: { userId: string | null; guest: boolean; email: string | null; name: string | null; username: string | null; school: string | null; anonymousId: string | null; joined: string | null; strikes: number; anonymousPosts: number; roomPosts: number; listings: number; lastSeen: string | null; country: string | null; device: string | null; browser: string | null };
  messages: Array<{ author: 'user' | 'staff'; body: string; createdAt: string }>;
};

const whoLabel = (who: Who) => who.name || who.email || (who.anonymousId ? `Anonymous ID ${who.anonymousId}` : who.guest ? 'Guest (no account)' : 'Unknown');

/** Admin "Support" tab: problems people report, including from guests and Anonymous users, with what you need to help them. */
export function SupportPanel({ session }: { session: Session }) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await adminCall<{ openCount: number; tickets: Ticket[] }>(session, `/api/v1/admin/support?status=${filter}`);
      setTickets(result.tickets);
      setOpenCount(result.openCount);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load issues.');
    }
  }, [filter, session]);

  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) await load(); })();
    return () => { active = false; };
  }, [load]);

  const open = async (id: string) => {
    try { setSelected(await adminCall<Detail>(session, `/api/v1/admin/support/${id}`)); setReply(''); } catch (openError) { setError(openError instanceof Error ? openError.message : 'Could not open it.'); }
  };

  const act = async (payload: { body?: string; status?: 'resolved' | 'open' }) => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminCall(session, `/api/v1/admin/support/${selected.id}`, 'POST', payload);
      await open(selected.id);
      await load();
    } catch (actError) {
      setError(actError instanceof Error ? actError.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const send = (event: FormEvent) => { event.preventDefault(); if (reply.trim()) void act({ body: reply.trim() }); };

  return (
    <section className="admin-panel admin-section">
      <header>
        <div><h2>User issues {openCount > 0 ? `(${openCount} open)` : ''}</h2></div>
        <div aria-label="Filter" className="adm-seg" role="tablist">
          {(['open', 'resolved', 'all'] as const).map((key) => <button aria-selected={filter === key} key={key} onClick={() => { setFilter(key); setSelected(null); }} role="tab" type="button">{key[0].toUpperCase() + key.slice(1)}</button>)}
        </div>
      </header>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}

      {selected ? (
        <div>
          <button className="admin-btn-action" onClick={() => setSelected(null)} type="button">← All issues</button>
          <div className="adm-card">
            <h3 style={{ margin: '0 0 4px' }}>{selected.subject}</h3>
            <p className="admin-muted">{selected.kind} · {new Date(selected.createdAt).toLocaleString()} · {selected.status}{selected.context.page ? ` · from ${selected.context.page}` : ''}</p>
            <div className="adm-people">
              <div><span>Who</span>{whoLabel(selected.person)}</div>
              <div><span>Account</span>{selected.person.guest ? 'Guest (no sign-up)' : selected.person.email ?? '—'}</div>
              <div><span>Anonymous ID</span>{selected.person.anonymousId ?? '—'}</div>
              <div><span>School</span>{selected.person.school ?? '—'}</div>
              <div><span>Joined</span>{selected.person.joined ? new Date(selected.person.joined).toLocaleDateString() : '—'}</div>
              <div><span>Last seen</span>{selected.person.lastSeen ? new Date(selected.person.lastSeen).toLocaleString() : '—'}</div>
              <div><span>Strikes</span>{selected.person.strikes}</div>
              <div><span>Posts</span>{selected.person.anonymousPosts} anonymous · {selected.person.roomPosts} room · {selected.person.listings} listings</div>
              <div><span>Device</span>{[selected.person.device, selected.person.browser, selected.person.country].filter(Boolean).join(' · ') || '—'}</div>
              <div><span>User id</span><span className="adm-code" style={{ opacity: 1 }}>{selected.person.userId ?? '—'}</span></div>
            </div>
          </div>
          <div className="adm-thread">
            {selected.messages.map((message, index) => (
              <div className={message.author === 'staff' ? 'adm-msg adm-msg--staff' : 'adm-msg'} key={index}>
                <small>{message.author === 'staff' ? 'Support' : 'Them'} · {new Date(message.createdAt).toLocaleString()}</small>
                {message.body}
              </div>
            ))}
          </div>
          <form className="adm-form" onSubmit={send}>
            <label>Reply (they are notified in the app)<textarea maxLength={3000} onChange={(event) => setReply(event.target.value)} rows={3} value={reply} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="admin-btn-action" disabled={busy || !reply.trim()} type="submit">Send reply</button>
              {selected.status === 'open'
                ? <button className="admin-btn-action" disabled={busy} onClick={() => void act({ status: 'resolved' })} type="button">Mark resolved</button>
                : <button className="admin-btn-action" disabled={busy} onClick={() => void act({ status: 'open' })} type="button">Reopen</button>}
            </div>
          </form>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Issue</th><th>From</th><th>Type</th><th>Last message</th><th>Updated</th></tr></thead>
            <tbody>
              {tickets === null ? <tr><td colSpan={5}>Loading…</td></tr> : tickets.length === 0 ? <tr><td colSpan={5}>Nothing here.</td></tr> : tickets.map((ticket) => (
                <tr key={ticket.id} onClick={() => void open(ticket.id)} style={{ cursor: 'pointer' }}>
                  <td><b>{ticket.subject}</b><br /><small>{ticket.status}{ticket.lastAuthor === 'user' && ticket.status === 'open' ? ' · waiting for you' : ''}</small></td>
                  <td>{whoLabel(ticket.who)}{ticket.who.guest ? ' (guest)' : ''}</td>
                  <td>{ticket.kind}</td>
                  <td>{ticket.preview}</td>
                  <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
