'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/cr/Avatars';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useAppSession } from '@/features/app/AppSession';
import { institutions } from '@/lib/institutions';
import { searchPeople, type PersonSummary } from './api';

const RECENT_KEY = 'commonroom:recent-searches';

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecent(items: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked (private mode): recent searches simply won't persist.
  }
}

/** Mockups 54, 55, 57 and 61. Students come from /api/v1/people; schools from the local directory. */
export function SearchScreen() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readRecent()));
  const [peopleState, setPeople] = useState<PersonSummary[]>([]);
  const [statusState, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retry, setRetry] = useState(0);

  const clean = query.trim();
  const searching = clean.length >= 2 && Boolean(account);
  // Results only count while a search is active, so there is nothing to reset when the box is cleared.
  const people = searching ? peopleState : [];
  const status = searching ? statusState : 'idle';

  useEffect(() => {
    if (!searching || !account) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus('loading');
      searchPeople(account, clean, controller.signal)
        .then((result) => { setPeople(result); setStatus('ready'); })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setStatus('error');
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, clean, retry, searching]);

  const schools = useMemo(() => {
    if (clean.length < 2) return [];
    const value = clean.toLowerCase();
    return institutions.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(value)).slice(0, 4);
  }, [clean]);

  const remember = (value: string) => {
    const next = [value, ...recent.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
    setRecent(next);
    writeRecent(next);
  };

  const openPerson = (person: PersonSummary) => {
    remember(clean);
    router.push(`/u/${person.id}`);
  };

  const nothing = status === 'ready' && people.length === 0 && schools.length === 0;

  return (
    <main className="cr-screen cr-search">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-sch cr-sch--grow">
          <Icon name="srch" />
          <input aria-label="Search students and schools" autoFocus enterKeyHint="search" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && clean) remember(clean); }} placeholder="Search students and schools" type="search" value={query} />
          {query ? <button aria-label="Clear search" className="cr-icon-btn" onClick={() => setQuery('')} type="button"><Icon name="x" /></button> : null}
        </div>
      </header>

      {ready && !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to search for students." icon="srch" title="Find people on campus" />
      ) : null}

      {account && clean.length < 2 ? (
        recent.length ? (
          <>
            <div className="cr-sp"><p className="cr-section-label">Recent</p><button className="cr-link cr-link--muted" onClick={() => { setRecent([]); writeRecent([]); }} type="button">Clear</button></div>
            {recent.map((item) => (
              <button className="cr-row-btn" key={item} onClick={() => setQuery(item)} type="button"><Icon name="clk" /><span className="cr-row-btn__main"><span className="cr-row-btn__title">{item}</span></span></button>
            ))}
          </>
        ) : <p className="cr-empty-line">Search for students by name or username, or for a school.</p>
      ) : null}

      {account && clean.length >= 2 ? (
        <>
          {status === 'loading' ? <p className="cr-empty-line" role="status">Searching…</p> : null}
          {status === 'error' ? (
            <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => setRetry((value) => value + 1)} type="button">Try again</button>} description="Check your connection and try again." icon="warn" role="alert" title="Search didn’t load" />
          ) : null}
          {people.length ? <p className="cr-section-label">Students</p> : null}
          {people.map((person) => (
            <button className="cr-row-btn" key={person.id} onClick={() => openPerson(person)} type="button">
              <UserAvatar name={person.display_name} src={person.avatar_url} tone="gray" />
              <span className="cr-row-btn__main">
                <span className="cr-row-btn__title">{person.display_name}</span>
                <span className="cr-row-btn__sub">{[person.username ? `@${person.username}` : '', person.school ?? ''].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          ))}
          {schools.length && status !== 'loading' ? <p className="cr-section-label">Schools</p> : null}
          {status !== 'loading' ? schools.map((school) => (
            <div className="cr-row-btn cr-row-btn--static" key={school.id}>
              <span aria-hidden="true" className="cr-av cr-av--g">{school.name.slice(0, 1)}</span>
              <span className="cr-row-btn__main"><span className="cr-row-btn__title">{school.name}</span><span className="cr-row-btn__sub">{school.location}</span></span>
            </div>
          )) : null}
          {nothing ? <StateBlock description="Check the spelling or try a different name." icon="srch" title={`No results for “${clean}”`} /> : null}
        </>
      ) : null}
    </main>
  );
}

/**
 * Mockup 59. There is no notifications API yet, so this screen says so plainly
 * instead of showing an empty list that would look like real history.
 */