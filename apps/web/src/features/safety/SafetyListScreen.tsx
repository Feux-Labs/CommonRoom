'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/cr/Avatars';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';

type Person = { id: string; display_name: string; username: string | null; avatar_url: string | null };

/** "Blocked accounts" and "Muted accounts" in Settings: who is on the list, and a button to undo it. */
export function SafetyListScreen({ kind }: { kind: 'blocks' | 'mutes' }) {
  const router = useRouter();
  const toast = useToast();
  const { account, ready, requireAccount } = useAppSession();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const title = kind === 'blocks' ? 'Blocked accounts' : 'Muted accounts';

  useEffect(() => {
    if (!ready || !account) return;
    let active = true;
    void (async () => {
      try {
        const list = await apiRequest<Person[]>(`/api/v1/safety/${kind}`, { session: account });
        if (!active) return;
        setPeople(list);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, [account, ready, kind, attempt]);

  const undo = async (person: Person) => {
    if (!account || busyId) return;
    setBusyId(person.id);
    try {
      await apiRequest(`/api/v1/safety/${kind}`, { session: account, method: 'DELETE', body: { userId: person.id } });
      setPeople((current) => (current ? current.filter((item) => item.id !== person.id) : current));
      toast.show(kind === 'blocks' ? `${person.display_name} is unblocked` : `${person.display_name} is unmuted`);
    } catch (error) {
      toast.show(errorMessage(error, 'That didn’t work. Try again.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="cr-screen">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/settings')} type="button"><Icon name="back" /></button>
        <h1 className="cr-hd__t">{title}</h1>
        <span className="cr-hd__spacer" />
      </header>
      {!ready ? null : !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to manage this list." icon="user" title={title} />
      ) : failed ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="This list didn’t load" />
      ) : people === null ? (
        <p className="cr-notif__loading">Loading…</p>
      ) : people.length === 0 ? (
        <StateBlock description={kind === 'blocks' ? 'People you block can’t see your posts or profile, and you can’t see theirs.' : 'People you mute stay quiet in your feed. They aren’t told.'} icon="user" title={kind === 'blocks' ? 'No one blocked' : 'No one muted'} />
      ) : (
        <ul className="cr-safety__list">
          {people.map((person) => (
            <li className="cr-safety__row" key={person.id}>
              <UserAvatar name={person.display_name} size="m" src={person.avatar_url} />
              <span className="cr-safety__who"><b>{person.display_name}</b>{person.username ? <small>@{person.username}</small> : null}</span>
              <button className="cr-ghost" disabled={busyId === person.id} onClick={() => void undo(person)} type="button">{kind === 'blocks' ? 'Unblock' : 'Unmute'}</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
