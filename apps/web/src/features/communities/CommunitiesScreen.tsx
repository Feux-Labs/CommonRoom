'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { createCommunity, listCommunities, type Community } from './api';
import './communities.css';

/** Browse and search communities, and start your own. */
export function CommunitiesScreen() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Community[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const list = await listCommunities(account, query.trim());
          if (active) { setItems(list); setStatus('ready'); }
        } catch {
          if (active) setStatus('error');
        }
      })();
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [account, query, ready, retry]);

  const create = async () => {
    if (!account || busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await createCommunity(account, { name: name.trim(), description: description.trim() });
      router.push(`/communities/${created.slug}`);
    } catch (createError) {
      setError(errorMessage(createError, 'Your community could not be created.'));
      setBusy(false);
    }
  };

  return (
    <main className="cr-screen cr-communities">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Communities</h1><p className="cr-hd__sub">Find your people, or start a group.</p></div>
      </header>

      {ready && !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to join and start communities." icon="user" title="Communities are for members" />
      ) : (
        <>
          <div className="cr-sch"><Icon name="srch" /><input aria-label="Search communities" onChange={(event) => setQuery(event.target.value)} placeholder="Search communities" type="search" value={query} /></div>
          <button className="cr-pbtn cr-pbtn--l cr-communities__new" onClick={() => { setError(''); setCreating(true); }} type="button">Start a community</button>
          {status === 'loading' ? <p className="cr-empty-line" role="status">Loading…</p> : null}
          {status === 'error' ? <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => { setStatus('loading'); setRetry((value) => value + 1); }} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="Communities didn’t load" /> : null}
          {status === 'ready' && items.length === 0 ? <p className="cr-empty-line">{query ? 'No communities match that.' : 'No communities yet. Start the first one.'}</p> : null}
          {items.map((community) => (
            <button className="cr-row-btn" key={community.id} onClick={() => router.push(`/communities/${community.slug}`)} type="button">
              <span aria-hidden="true" className="cr-av cr-av--g">{community.name.slice(0, 1).toUpperCase()}</span>
              <span className="cr-row-btn__main">
                <span className="cr-row-btn__title">{community.name}</span>
                <span className="cr-row-btn__sub">{community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}{community.joined ? ' · Joined' : ''}</span>
              </span>
            </button>
          ))}
        </>
      )}

      <BottomSheet description="Anyone can find it and join. Posts show in the group and in Room." onClose={() => setCreating(false)} open={creating} title="Start a community">
        <input aria-label="Community name" className="cr-input" maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="Name, e.g. UniAbuja 300L Engineering" value={name} />
        <textarea aria-label="What is it about" className="cr-textarea" maxLength={200} onChange={(event) => setDescription(event.target.value)} placeholder="What is it about? (optional)" rows={3} value={description} />
        {error ? <p role="alert" style={{ color: '#b3261e' }}>{error}</p> : null}
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setCreating(false)} type="button">Cancel</button>
          <button className="cr-pbtn cr-pbtn--l" disabled={busy || name.trim().length < 3} onClick={() => void create()} type="button">{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </BottomSheet>
    </main>
  );
}
