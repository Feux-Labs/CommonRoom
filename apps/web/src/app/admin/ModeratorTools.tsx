'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adminCall } from './adminApi';

type Who = { id: string; displayName: string };

function randomPassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

/** A small pop-up form for one thing a moderator account does: reply to a comment, or edit one of its posts. */
export function ActAsModal({ kind, who, session, onClose, onDone }: { kind: 'reply' | 'edit'; who: Who; session: Session; onClose: () => void; onDone: (message: string) => void }) {
  const [postId, setPostId] = useState('');
  const [commentId, setCommentId] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (kind === 'reply') await adminCall(session, '/api/v1/admin/crud', 'POST', { action: 'reply_as_user', asUserId: who.id, postId: postId.trim(), parentId: commentId.trim(), body: text.trim() });
      else await adminCall(session, '/api/v1/admin/crud', 'POST', { action: 'edit_post_as_user', asUserId: who.id, postId: postId.trim(), caption: text.trim() });
      onDone(kind === 'reply' ? `Reply posted as ${who.displayName}.` : `Post edited as ${who.displayName}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'That did not work.');
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal-backdrop" onClick={onClose} role="presentation">
      <form aria-label={kind === 'reply' ? 'Reply as moderator account' : 'Edit post as moderator account'} className="admin-panel adm-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void submit(event)}>
        <h3>{kind === 'reply' ? `Reply as ${who.displayName}` : `Edit a post by ${who.displayName}`}</h3>
        <label>Post ID<input onChange={(event) => setPostId(event.target.value)} required value={postId} /></label>
        {kind === 'reply' ? <label>Comment ID<input onChange={(event) => setCommentId(event.target.value)} required value={commentId} /></label> : null}
        <label>{kind === 'reply' ? 'Reply' : 'New text'}<textarea maxLength={1000} onChange={(event) => setText(event.target.value)} required rows={3} value={text} /></label>
        {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
        <div className="adm-modal-actions">
          <button className="admin-btn-action" onClick={onClose} type="button">Cancel</button>
          <button className="admin-btn-action" disabled={busy} type="submit">{busy ? 'Working…' : kind === 'reply' ? 'Post reply' : 'Save edit'}</button>
        </div>
      </form>
    </div>
  );
}

/** Sign up a new moderator account: an account the team can act as, with its password kept so it can be signed in to. */
export function CreateModeratorForm({ session, onCreated }: { session: Session; onCreated: (message: string) => void }) {
  const [form, setForm] = useState({ email: '', password: '', displayName: '', school: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await adminCall<{ email: string; password: string }>(session, '/api/v1/admin/crud', 'POST', { action: 'create_moderator_account', ...form });
      setForm({ email: '', password: '', displayName: '', school: '' });
      onCreated(`Moderator account created: ${created.email}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The account could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form aria-label="Create a moderator account" className="admin-form-grid" onSubmit={(event) => void submit(event)}>
      <label>Name<input maxLength={60} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required value={form.displayName} /></label>
      <label>Email<input maxLength={120} onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></label>
      <label>Password
        <span style={{ display: 'flex', gap: 8 }}>
          <input autoComplete="new-password" minLength={10} onChange={(event) => setForm({ ...form, password: event.target.value })} required style={{ flex: 1 }} type="text" value={form.password} />
          <button className="admin-btn-action" onClick={() => setForm({ ...form, password: randomPassword() })} type="button">Generate</button>
        </span>
      </label>
      <label>School (optional)<input maxLength={120} onChange={(event) => setForm({ ...form, school: event.target.value })} value={form.school} /></label>
      {error ? <p role="alert" style={{ color: '#ff8a8a', gridColumn: '1 / -1' }}>{error}</p> : null}
      <button className="admin-btn-action admin-btn-primary" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create moderator account'}</button>
    </form>
  );
}
