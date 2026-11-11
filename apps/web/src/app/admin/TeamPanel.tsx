'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adminCall, type AdminMe } from './adminApi';
import './admin-extra.css';

type Member = { userId: string; role: AdminMe['role']; email: string | null; createdAt: string; you: boolean };

const ROLE_HELP: Array<[string, string]> = [
  ['Owner', 'Everything, including admins and locking staff creation. Only one, set in the database.'],
  ['Admin', 'Everything except admins and the lock. Can create moderators, support and analysts, and normal accounts.'],
  ['Moderator', 'Reports queue, removing content, strikes, and seeing user issues.'],
  ['Support', 'User issues and looking people up (no passwords, no changes).'],
  ['Analyst', 'The Analytics dashboard only.'],
];

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

/** Admin "Team" tab: create accounts for users and staff, change or remove roles, and lock staff creation for good. */
export function TeamPanel({ session, me, onLocked }: { session: Session; me: AdminMe; onLocked: () => void }) {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [locked, setLocked] = useState(me.creationLocked);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'moderator' });
  const [created, setCreated] = useState<{ email: string; password: string; role: string } | null>(null);
  const [confirm, setConfirm] = useState('');
  const isOwner = me.role === 'owner';

  const load = useCallback(async () => {
    try {
      const result = await adminCall<{ locked: boolean; team: Member[] }>(session, '/api/v1/admin/team');
      setTeam(result.team);
      setLocked(result.locked);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the team.');
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) await load(); })();
    return () => { active = false; };
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setNotice(''); setCreated(null);
    try {
      const result = await adminCall<{ email: string; role: string }>(session, '/api/v1/admin/team', 'POST', form);
      setCreated({ email: result.email, password: form.password, role: result.role });
      setForm({ email: '', password: '', displayName: '', role: form.role });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the account.');
    }
  };

  const change = async (member: Member, role: string) => {
    setError(''); setNotice('');
    try { await adminCall(session, '/api/v1/admin/team', 'PATCH', { userId: member.userId, role }); await load(); setNotice('Role updated.'); } catch (changeError) { setError(changeError instanceof Error ? changeError.message : 'Could not change the role.'); }
  };
  const remove = async (member: Member) => {
    if (!window.confirm(`Remove ${member.email ?? 'this person'} from the team? Their normal account stays.`)) return;
    setError(''); setNotice('');
    try { await adminCall(session, '/api/v1/admin/team', 'DELETE', { userId: member.userId }); await load(); setNotice('Removed from the team.'); } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Could not remove them.'); }
  };
  const lock = async () => {
    setError(''); setNotice('');
    try { await adminCall(session, '/api/v1/admin/team/lock', 'POST', { confirm }); setLocked(true); setConfirm(''); onLocked(); setNotice('Staff creation is locked for good.'); } catch (lockError) { setError(lockError instanceof Error ? lockError.message : 'Could not lock it.'); }
  };

  const roleOptions = isOwner ? ['user', 'moderator', 'support', 'analyst', 'admin'] : ['user', 'moderator', 'support', 'analyst'];

  return (
    <section className="admin-panel admin-section">
      <header><div><h2>Team and accounts</h2></div></header>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {notice ? <p role="status" style={{ color: '#7be8b0' }}>{notice}</p> : null}

      <div className="admin-table-wrap"><table>
        <thead><tr><th>Person</th><th>Role</th><th>Since</th><th /></tr></thead>
        <tbody>{team === null ? <tr><td colSpan={4}>Loading…</td></tr> : team.map((member) => (
          <tr key={member.userId}>
            <td>{member.email ?? member.userId}{member.you ? ' (you)' : ''}</td>
            <td>{member.role === 'owner' || member.you || locked
              ? member.role
              : <select aria-label={`Role for ${member.email}`} onChange={(event) => void change(member, event.target.value)} value={member.role}>{['admin', 'moderator', 'support', 'analyst'].filter((role) => role !== 'admin' || isOwner).map((role) => <option key={role} value={role}>{role}</option>)}</select>}</td>
            <td>{new Date(member.createdAt).toLocaleDateString()}</td>
            <td>{member.role === 'owner' || member.you ? null : <button className="admin-btn-action" onClick={() => void remove(member)} type="button">Remove</button>}</td>
          </tr>
        ))}</tbody>
      </table></div>

      <h3 className="adm-h3">Create an account</h3>
      <p className="admin-muted">{locked ? 'Staff accounts are locked for good. You can still create normal user accounts.' : 'Creates a confirmed account they can sign in to straight away. Share the password with them privately; it is shown only once.'}</p>
      <form className="adm-form" onSubmit={(event) => void create(event)}>
        <label>Email<input autoComplete="off" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></label>
        <label>Name (optional)<input maxLength={60} onChange={(event) => setForm({ ...form, displayName: event.target.value })} value={form.displayName} /></label>
        <label>Password (10 or more characters)
          <span style={{ display: 'flex', gap: 8 }}>
            <input autoComplete="new-password" minLength={10} onChange={(event) => setForm({ ...form, password: event.target.value })} required style={{ flex: 1 }} type="text" value={form.password} />
            <button className="admin-btn-action" onClick={() => setForm({ ...form, password: randomPassword() })} type="button">Generate</button>
          </span>
        </label>
        <label>Role<select onChange={(event) => setForm({ ...form, role: event.target.value })} value={form.role}>{roleOptions.map((role) => <option disabled={locked && role !== 'user'} key={role} value={role}>{role === 'user' ? 'Normal user (no admin access)' : role}</option>)}</select></label>
        <button className="admin-btn-action" disabled={locked && form.role !== 'user'} type="submit">Create account</button>
      </form>
      {created ? (
        <div className="adm-card" role="status">
          <b>Account created. Copy this now, it is not shown again.</b>
          <p className="adm-code">Email: {created.email}<br />Password: {created.password}<br />Role: {created.role}</p>
        </div>
      ) : null}

      <h3 className="adm-h3">What each role can do</h3>
      <div className="admin-table-wrap"><table><tbody>{ROLE_HELP.map(([role, text]) => <tr key={role}><td><b>{role}</b></td><td>{text}</td></tr>)}</tbody></table></div>

      {isOwner ? (
        <div className={locked ? 'adm-card' : 'adm-card adm-danger'}>
          <h3 style={{ margin: '0 0 6px' }}>Lock admin creation</h3>
          {locked ? <p>Locked. No staff account can be created or promoted from the dashboard. Only a direct database change can undo this.</p> : (
            <>
              <p>Stops any new admin, moderator, support or analyst account from ever being created or promoted. <b>This cannot be undone from the dashboard.</b> Existing staff keep their access, and you can still remove people and create normal user accounts.</p>
              <div className="adm-form">
                <label>Type LOCK to confirm<input onChange={(event) => setConfirm(event.target.value)} value={confirm} /></label>
                <button className="admin-btn-action" disabled={confirm !== 'LOCK'} onClick={() => void lock()} type="button">Lock for good</button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
