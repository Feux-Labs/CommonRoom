'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/cr/Avatars';
import { ErrorBlock, FeedSkeleton, GridSkeleton, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { ShareSheet } from '@/components/cr/ShareSheet';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { toProfile, useAppSession, type ProfileApiRecord } from '@/features/app/AppSession';
import { removeUserMedia, uploadUserMedia } from '@/features/app/media';
import { ONBOARDING_INTERESTS, profilePhotoProblem } from '@/features/auth/Onboarding';
import { DEFAULT_QUERY, fetchListings } from '@/features/market/api';
import { compactCount, formatNaira } from '@/lib/format';
import { institutions } from '@/lib/institutions';
import type { MarketplaceListing } from '@/lib/marketplace-contracts';
import type { RoomPost } from '@/lib/room-contracts';
import { SafetyMenu } from '@/features/safety/SafetyMenu';
import { useHydrated } from '@/lib/use-hydrated';
import { fetchPerson, postThumbnail, setFollowing, type PersonProfile } from './api';

function subtitle(course?: string | null, year?: string | null) {
  return [course, year].filter((value) => value && value.trim()).join(' · ');
}

function PostGrid({ posts }: { posts: RoomPost[] }) {
  if (!posts.length) return <StateBlock description="Posts will show up here." icon="img" title="No posts yet" />;
  return (
    <ul className="cr-pgrid" aria-label="Posts">
      {posts.map((post) => {
        const thumb = postThumbnail(post);
        return (
          <li key={post.id}>
            <Link aria-label={post.caption ? post.caption.slice(0, 80) : 'Open post'} className="cr-pgrid__cell" href={`/posts/${post.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- post media */}
              {thumb ? <img alt="" loading="lazy" src={thumb} /> : <span className="cr-pgrid__text">{post.caption || (post.mediaType === 'poll' ? 'Poll' : 'Post')}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListingGrid({ listings }: { listings: MarketplaceListing[] }) {
  if (!listings.length) return <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/marketplace/sell">Sell an item</Link>} description="Things you list will show up here." icon="bag" title="No listings yet" />;
  return (
    <ul className="cr-g2 cr-g2--pad" aria-label="Listings">
      {listings.map((listing) => (
        <li className={listing.status === 'sold' ? 'cr-li cr-li--sold' : 'cr-li'} key={listing.id}>
          <Link className="cr-li__link" href={`/marketplace/${listing.id}`}>
            <span className="cr-tile">
              {/* eslint-disable-next-line @next/next/no-img-element -- listing photo */}
              {listing.images[0] ? <img alt="" loading="lazy" src={listing.images[0]} /> : <Icon name="bag" />}
              {listing.status === 'sold' ? <span className="cr-tag">Sold</span> : null}
            </span>
            <span className="cr-li__n">{listing.title}</span>
            <span className="cr-li__p">{formatNaira(listing.price)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Profile and status" and mockup 41 (listings tab). Status/badges are omitted until the server calculates them. */
export function MyProfile() {
  const router = useRouter();
  const { account, profile, ready, requireAccount } = useAppSession();
  const [tab, setTab] = useState<'posts' | 'listings'>('posts');
  const [person, setPerson] = useState<PersonProfile | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [shareOpen, setShareOpen] = useState(false);

  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      requireAccount('sign-in');
      router.replace('/anonymous');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const loaded = await fetchPerson(account, account.user.id);
        if (!active) return;
        setPerson(loaded);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, ready, requireAccount, router]);

  useEffect(() => {
    if (tab !== 'listings' || listings || !account) return;
    fetchListings(account, { ...DEFAULT_QUERY, tab: 'my_listings' }).then(setListings).catch(() => setListings([]));
  }, [account, listings, tab]);

  if (!profile) return <main className="cr-screen"><FeedSkeleton count={1} label="Loading profile" /></main>;

  return (
    <main className="cr-screen cr-screen--flush cr-profile">
      <header className="cr-hd cr-pad">
        <span className="cr-hd__t">{profile.username ? `@${profile.username}` : profile.displayName}</span>
        <Link aria-label="Settings" className="cr-icon-btn" href="/settings"><Icon name="cog" /></Link>
      </header>
      <section className="cr-pad">
        <div className="cr-profile__top">
          <UserAvatar name={profile.displayName} size="l" src={profile.avatarUrl} />
          <div className="cr-profile__who">
            <h1 className="cr-profile__name">{profile.displayName}</h1>
            {subtitle(profile.course, profile.year) ? <p className="cr-profile__sub">{subtitle(profile.course, profile.year)}</p> : null}
            {profile.school && profile.showSchoolOnProfile ? <p className="cr-profile__sub">{profile.school}</p> : null}
          </div>
        </div>
        {person?.bio ? <p className="cr-profile__bio">{person.bio}</p> : null}
        <div className="cr-stats cr-stats--left">
          <div><b>{compactCount(person?.posts.length ?? 0)}</b>Posts</div>
          <div><b>{compactCount(person?.follower_count ?? 0)}</b>Followers</div>
        </div>
        <div className="cr-btnrow">
          <Link className="cr-ghost cr-ghost--l" href="/me/edit">Edit profile</Link>
          <button aria-label="Share profile" className="cr-ghost cr-ghost--l cr-ghost--square" onClick={() => setShareOpen(true)} type="button"><Icon name="up" /></button>
        </div>
      </section>
      <div className="cr-tabbar cr-tabbar--flush" role="tablist" aria-label="Profile sections">
        <button aria-selected={tab === 'posts'} onClick={() => setTab('posts')} role="tab" type="button">Posts</button>
        <button aria-selected={tab === 'listings'} onClick={() => setTab('listings')} role="tab" type="button">Listings</button>
      </div>
      {tab === 'posts' ? (
        status === 'loading' ? <FeedSkeleton count={1} label="Loading posts" />
          : status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t load your posts" />
            : <PostGrid posts={person?.posts ?? []} />
      ) : listings === null ? <div className="cr-pad"><GridSkeleton count={2} /></div> : <ListingGrid listings={listings} />}
      <ShareSheet
        onClose={() => setShareOpen(false)}
        open={shareOpen}
        text={`${profile.displayName} on Common Room`}
        title="Share profile"
        url={typeof window === 'undefined' || !account ? '' : `${window.location.origin}/u/${account.user.id}`}
      />
    </main>
  );
}

/** Mockup 38. Saves through PUT /api/v1/profile; photo goes to Storage first. */
export function EditProfile() {
  const router = useRouter();
  const toast = useToast();
  const { account, profile, setProfile } = useAppSession();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [course, setCourse] = useState(profile?.course ?? '');
  const [year, setYear] = useState(profile?.year ?? '');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const preview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : null), [avatarFile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!profile || !account) return <main className="cr-screen"><FeedSkeleton count={1} label="Loading profile" /></main>;

  const currentAvatar = preview ?? (avatarRemoved ? null : profile.avatarUrl);
  const knownSchool = !school || institutions.some((item) => item.name === school);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('Enter your name.');
      return;
    }
    setSaving(true);
    setError('');
    let uploaded: { path: string; url: string } | null = null;
    try {
      if (avatarFile) uploaded = await uploadUserMedia(account, avatarFile, 'profile-');
      const saved = await apiRequest<ProfileApiRecord>('/api/v1/profile', {
        session: account,
        method: 'PUT',
        body: {
          displayName: displayName.trim(),
          course: course.trim(),
          year: year.trim(),
          school: school || null,
          educationStatus: school ? 'currently_in_school' : profile.educationStatus === 'currently_in_school' ? 'prefer_not_to_say' : profile.educationStatus,
          showSchoolOnProfile: profile.showSchoolOnProfile,
          ageEligibilityConfirmed: true,
          interests,
          avatarUrl: uploaded ? uploaded.url : avatarRemoved ? null : profile.avatarUrl,
        },
      });
      setProfile(toProfile(saved, uploaded?.url ?? null));
      toast.show('Profile saved');
      router.push('/me');
    } catch (saveError) {
      if (uploaded) await removeUserMedia([uploaded.path]);
      setError(errorMessage(saveError, 'Your profile could not be saved.'));
      setSaving(false);
    }
  };

  return (
    <main className="cr-screen cr-screen--nonav">
      <form noValidate onSubmit={(event) => void save(event)}>
        <header className="cr-hd">
          <button aria-label="Close" className="cr-icon-btn" onClick={() => router.push('/me')} type="button"><Icon name="x" /></button>
          <h1 className="cr-hd__t">Edit profile</h1>
          <button className="cr-pbtn" disabled={saving || !displayName.trim()} type="submit">{saving ? 'Saving…' : 'Save'}</button>
        </header>
        <div className="cr-edit__photo">
          <button aria-label="Change photo" className="cr-edit__avatar" onClick={() => fileInput.current?.click()} type="button">
            <UserAvatar name={displayName} size="xl" src={currentAvatar} />
            <span className="cr-edit__cam" aria-hidden="true"><Icon name="camera" /></span>
          </button>
          <div className="cr-btnrow cr-btnrow--center">
            <button className="cr-link" onClick={() => fileInput.current?.click()} type="button">Change photo</button>
            {currentAvatar ? <button className="cr-link cr-link--muted" onClick={() => { setAvatarFile(null); setAvatarRemoved(true); }} type="button">Remove</button> : null}
          </div>
          {avatarError ? <p className="cr-msg cr-msg--e" role="alert">{avatarError}</p> : null}
        </div>
        <input
          accept="image/jpeg,image/png"
          className="cr-visually-hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (!file) return;
            const problem = profilePhotoProblem(file);
            if (problem) {
              setAvatarError(problem);
              return;
            }
            setAvatarError('');
            setAvatarRemoved(false);
            setAvatarFile(file);
          }}
          ref={fileInput}
          tabIndex={-1}
          type="file"
        />
        <label className="cr-label" htmlFor="cr-edit-name">Name</label>
        <div className="cr-input"><input autoComplete="name" id="cr-edit-name" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} value={displayName} /></div>
        <label className="cr-label" htmlFor="cr-edit-username">Username</label>
        <div className="cr-input cr-input--readonly"><input id="cr-edit-username" readOnly value={profile.username ? `@${profile.username}` : ''} /></div>
        <p className="cr-msg">Usernames can’t be changed yet.</p>
        <label className="cr-label" htmlFor="cr-edit-school">School</label>
        <select className="cr-select" id="cr-edit-school" onChange={(event) => setSchool(event.target.value)} value={school}>
          <option value="">Not in school / prefer not to say</option>
          {!knownSchool ? <option value={school}>{school}</option> : null}
          {institutions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <div className="cr-two">
          <div>
            <label className="cr-label" htmlFor="cr-edit-course">Department</label>
            <div className="cr-input"><input id="cr-edit-course" maxLength={80} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Economics" value={course} /></div>
          </div>
          <div>
            <label className="cr-label" htmlFor="cr-edit-year">Level</label>
            <div className="cr-input"><input id="cr-edit-year" maxLength={40} onChange={(event) => setYear(event.target.value)} placeholder="e.g. 200L" value={year} /></div>
          </div>
        </div>
        <span className="cr-label" id="cr-edit-interests">Interests</span>
        <div aria-labelledby="cr-edit-interests" className="cr-chips" role="group">
          {ONBOARDING_INTERESTS.map((interest) => {
            const on = interests.includes(interest);
            return <button aria-pressed={on} className={on ? 'cr-chip on' : 'cr-chip'} key={interest} onClick={() => setInterests((list) => (on ? list.filter((item) => item !== interest) : [...list, interest]))} type="button">{interest}</button>;
          })}
        </div>
        {error ? <div className="cr-create__error" role="alert"><span>{error}</span></div> : null}
      </form>
    </main>
  );
}

/** Mockups 31 and 39: another student's profile with follow. */
export function PersonProfileScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { account, ready, requireAccount } = useAppSession();
  const hydrated = useHydrated();
  const [person, setPerson] = useState<PersonProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

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
    if (account.user.id === id) {
      router.replace('/me');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const loaded = await fetchPerson(account, id);
        if (!active) return;
        setPerson(loaded);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [account, attempt, id, ready, requireAccount, router]);

  const toggleFollow = async () => {
    if (!person || !account) return;
    const next = !person.following;
    setBusy(true);
    setPerson({ ...person, following: next, follower_count: Math.max(0, person.follower_count + (next ? 1 : -1)) });
    try {
      await setFollowing(account, person.id, next);
    } catch (error) {
      setPerson((current) => (current ? { ...current, following: !next, follower_count: Math.max(0, current.follower_count + (next ? -1 : 1)) } : current));
      toast.show(errorMessage(error, 'That didn’t work. Try again.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="cr-screen cr-screen--flush cr-profile">
      <header className="cr-hd cr-pad">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <span className="cr-hd__t">{person?.username ? `@${person.username}` : ''}</span>
        <span className="cr-hd__actions">
          <button aria-label="Share profile" className="cr-icon-btn" disabled={!person} onClick={() => setShareOpen(true)} type="button"><Icon name="up" /></button>
          <button aria-label="More options" className="cr-icon-btn" disabled={!person} onClick={() => { if (requireAccount('sign-in')) setSafetyOpen(true); }} type="button"><Icon name="more" /></button>
        </span>
      </header>
      {hydrated && !account && ready ? <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to see student profiles." icon="user" title="Sign in to continue" /> : null}
      {!hydrated || (status === 'loading' && account) ? <div className="cr-pad"><FeedSkeleton count={1} label="Loading profile" /></div> : null}
      {status === 'error' ? <ErrorBlock description="It may not exist, or your connection dropped." onRetry={reload} title="Couldn’t load this profile" /> : null}
      {status === 'ready' && person ? (
        <>
          <section className="cr-pad">
            <div className="cr-profile__top">
              <UserAvatar name={person.display_name} size="l" src={person.avatar_url} />
              <div className="cr-profile__who">
                <h1 className="cr-profile__name">{person.display_name}</h1>
                {person.school ? <p className="cr-profile__sub">{person.school}</p> : null}
              </div>
            </div>
            {person.bio ? <p className="cr-profile__bio">{person.bio}</p> : null}
            <div className="cr-stats cr-stats--left">
              <div><b>{compactCount(person.posts.length)}</b>Posts</div>
              <div><b>{compactCount(person.follower_count)}</b>Followers</div>
            </div>
            <div className="cr-btnrow">
              <button aria-pressed={person.following} className={person.following ? 'cr-ghost cr-ghost--l' : 'cr-pbtn cr-pbtn--l'} disabled={busy} onClick={() => void toggleFollow()} type="button">{person.following ? 'Following' : 'Follow'}</button>
            </div>
            {person.interests.length ? <div className="cr-chips cr-profile__interests">{person.interests.map((interest) => <span className="cr-chip" key={interest}>{interest}</span>)}</div> : null}
          </section>
          <div className="cr-tabbar cr-tabbar--flush" role="tablist" aria-label="Profile sections"><button aria-selected="true" role="tab" type="button">Posts</button></div>
          <PostGrid posts={person.posts} />
          <ShareSheet onClose={() => setShareOpen(false)} open={shareOpen} text={`${person.display_name} on Common Room`} title="Share profile" url={typeof window === 'undefined' ? '' : window.location.href} />
          <SafetyMenu name={person.display_name} onClose={() => setSafetyOpen(false)} open={safetyOpen} userId={person.id} />
        </>
      ) : null}
    </main>
  );
}
