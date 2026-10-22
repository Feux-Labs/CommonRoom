'use client';

import { Camera, ChevronLeft, ChevronRight, Heart, LoaderCircle, MessageCircle, Send, Star, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { demoMeetProfiles } from '@/lib/demo-content';

type MeetProfile = {
  user_id: string;
  display_name: string;
  school: string | null;
  bio: string;
  interests: string[];
  photo_urls: string[];
  username?: string | null;
  course?: string | null;
  year?: string | null;
  avatar_url?: string | null;
};

type MeetData = {
  me: {
    profile: { displayName: string; school: string | null; course: string; year: string; avatarUrl: string | null };
    meet: {
      display_name: string;
      bio: string;
      interests: string[];
      photo_urls: string[];
      discoverable: boolean;
    } | null;
  };
  profiles: MeetProfile[];
  people: MeetProfile[];
  demoContent?: boolean;
};

type Props = {
  session: Session | null;
  profile: { id: string; displayName: string; school: string | null };
  onRequireAccount: () => void;
};

type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

async function meetRequest<T>(token: string | null, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/v1/dating', {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  if (!result || !('data' in result)) throw new Error('The Connect service returned an invalid response.');
  return result.data as T;
}

async function meetChatRequest<T>(token: string, body: unknown): Promise<T> {
  const response = await fetch('/api/v1/dating/chat', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  if (!result || !('data' in result)) throw new Error('The messaging service returned an invalid response.');
  return result.data as T;
}

export function MeetExperience({ session, profile, onRequireAccount }: Props) {
  const [data, setData] = useState<MeetData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'discover' | 'people'>('discover');
  const [filter, setFilter] = useState<'all' | 'school'>('all');
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<{ profile: MeetProfile; conversationId: string; messages: ChatMessage[] } | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const supabase = getBrowserSupabase();

  const reload = useCallback(async () => {
    setError('');
    try {
      const result = await meetRequest<MeetData>(session?.access_token ?? null);
      const useDemoProfiles = result.profiles.length === 0 && process.env.NODE_ENV === 'development';
      setData(useDemoProfiles ? { ...result, profiles: demoMeetProfiles, demoContent: true } : result);
      setBio(result.me.meet?.bio ?? '');
      setInterests(result.me.meet?.interests.join(', ') ?? '');
      setPhotoUrls(result.me.meet?.photo_urls ?? []);
      setDiscoverable(result.me.meet?.discoverable ?? false);
      setShowSetup(Boolean(session && !result.me.meet && !useDemoProfiles));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Connect could not be loaded.');
      if (process.env.NODE_ENV === 'development') {
        setData({
          me: {
            profile: { displayName: '', school: null, course: '', year: '', avatarUrl: null },
            meet: null,
          },
          profiles: demoMeetProfiles,
          people: [],
          demoContent: true,
        });
      }
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChat?.messages.length]);

  const profiles = useMemo(() => {
    if (!data) return [];
    return data.profiles.filter((candidate) => !skipped.includes(candidate.user_id))
      .filter((candidate) => filter !== 'school' || candidate.school === profile.school);
  }, [data, filter, profile.school, skipped]);
  const candidate = profiles[0];
  const photos = candidate?.photo_urls.length ? candidate.photo_urls : candidate?.avatar_url ? [candidate.avatar_url] : [];

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (photoUrls.length + files.length > 6) {
      setError('Choose up to 6 photos in total.');
      return;
    }
    setPendingPhoto(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
          throw new Error('Connect photos must be images smaller than 10 MB each.');
        }
        const path = `${profile.id}/meet/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error: uploadError } = await supabase.storage.from('post-media').upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('post-media').getPublicUrl(path);
        uploaded.push(publicUrl.publicUrl);
      }
      setPhotoUrls((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Your photo could not be uploaded.');
    } finally {
      setPendingPhoto(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !session) return;
    if (discoverable && photoUrls.length < 1) {
      setError('Add at least one photo before making your Connect profile discoverable.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await meetRequest(session.access_token, 'PUT', {
        displayName: data.me.profile.displayName || profile.displayName,
        bio,
        interests: interests.split(',').map((item) => item.trim()).filter(Boolean),
        photoUrls,
        discoverable,
      });
      await reload();
      setShowSetup(false);
      setNotice(discoverable ? 'Your Connect profile is visible to eligible students.' : 'Your Connect profile is hidden.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your Connect profile could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const like = async (userId: string, superLike = false) => {
    if (!session) {
      onRequireAccount();
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await meetRequest<{ matched: boolean }>(session.access_token, 'POST', { userId, superLike });
      setSkipped((current) => [...current, userId]);
      setCurrentPhoto(0);
      setNotice(result.matched ? `You and ${candidate?.display_name} both said hello!` : 'Your interest was sent. Your contact details remain private.');
      if (result.matched) await reload();
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Your interest could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const pass = () => {
    if (!candidate) return;
    if (!session) {
      onRequireAccount();
      return;
    }
    setBusy(true);
    setError('');
    void meetRequest(session.access_token, 'POST', { userId: candidate.user_id, action: 'pass' })
      .then(() => {
        setSkipped((current) => [...current, candidate.user_id]);
        setCurrentPhoto(0);
      })
      .catch((passError: unknown) => setError(passError instanceof Error ? passError.message : 'This profile could not be passed.'))
      .finally(() => setBusy(false));
  };

  const openChat = async (person: MeetProfile) => {
    if (!session) {
      onRequireAccount();
      return;
    }
    setChatBusy(true);
    setError('');
    try {
      const chat = await meetChatRequest<{ conversationId: string; messages: ChatMessage[] }>(session.access_token, { userId: person.user_id });
      setActiveChat({ profile: person, conversationId: chat.conversationId, messages: chat.messages });
      setChatDraft('');
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'This conversation could not be opened.');
    } finally {
      setChatBusy(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !activeChat || !chatDraft.trim()) return;
    setChatBusy(true);
    setError('');
    try {
      const message = await meetChatRequest<ChatMessage>(session.access_token, {
        conversationId: activeChat.conversationId,
        message: chatDraft,
      });
      setActiveChat((current) => current ? { ...current, messages: [...current.messages, message] } : current);
      setChatDraft('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Your message could not be sent.');
    } finally {
      setChatBusy(false);
    }
  };

  if (!data && !error) {
    return <div className="meet-loading"><LoaderCircle aria-label="Loading Connect" className="meet-spinner" size={22} /></div>;
  }

  return (
    <section className="meet-experience">
      <header className="meet-heading">
        <div>
          <span className="eyebrow">CONNECT · YOU’RE IN CONTROL</span>
          <h1>Connect</h1>
          <p>Discover people who also opted in. Your exact location and contact details are never shown.</p>
        </div>
        <button className="secondary-button" onClick={session ? () => setShowSetup((visible) => !visible) : onRequireAccount} type="button">
          {session ? showSetup ? 'Back to Connect' : 'Edit my profile' : 'Sign in to connect'}
        </button>
      </header>
      {error ? <div className={`feedback${data?.demoContent ? '' : ' error-banner'}`} role={data?.demoContent ? 'status' : 'alert'}>{data?.demoContent ? 'Live Connect is unavailable; showing local sample profiles.' : error}<button className="icon-button" onClick={() => void reload()} type="button">Retry</button></div> : null}
      {notice ? <div className="feedback success-banner" role="status">{notice}<button aria-label="Dismiss" className="icon-button" onClick={() => setNotice('')} type="button"><X size={15} /></button></div> : null}
      {data?.demoContent ? <p className="meet-demo-note" role="note">Sample profiles for local preview only. No real people are shown.</p> : null}

      {showSetup && data ? (
        <form className="meet-setup panel" onSubmit={(event) => void saveProfile(event)}>
          <div>
            <span className="eyebrow">YOUR PROFILE</span>
            <h2>Show people who you are</h2>
            <p>Your profile uses your Commonroom name and school. Add photos and a short bio before opting in.</p>
          </div>
          <div className="meet-photo-grid">
            {photoUrls.map((url, index) => (
              <div className="meet-photo-thumb" key={url}>
                <img alt={`Connect profile photo ${index + 1}`} src={url} />
                <button aria-label={`Remove photo ${index + 1}`} className="meet-photo-remove" onClick={() => setPhotoUrls((current) => current.filter((item) => item !== url))} type="button"><X size={14} /></button>
              </div>
            ))}
            {photoUrls.length < 6 ? (
              <label className="meet-photo-add">
                {pendingPhoto ? <LoaderCircle className="meet-spinner" size={20} /> : <Camera size={20} />}
                <span>Add photos</span>
                <input accept="image/jpeg,image/png,image/webp" disabled={pendingPhoto} multiple onChange={(event) => void uploadPhotos(event)} type="file" />
              </label>
            ) : null}
          </div>
          <label className="meet-field">Short bio<textarea maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="A little about what you enjoy" rows={3} value={bio} /></label>
          <label className="meet-field">Interests <span>Separate with commas</span><input maxLength={500} onChange={(event) => setInterests(event.target.value)} placeholder="Music, books, football" value={interests} /></label>
          <label className="switch-row"><span>Show my profile to age-eligible students</span><input checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} type="checkbox" /></label>
          <div className="meet-setup-actions">
            <button className="primary-button" disabled={busy || pendingPhoto} type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
            {data.me.meet ? <button className="secondary-button" onClick={() => setShowSetup(false)} type="button">Cancel</button> : null}
          </div>
        </form>
      ) : (
        <>
          <nav aria-label="Connect sections" className="meet-tabs">
            <button aria-pressed={tab === 'discover'} className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')} type="button">Discover</button>
            {session ? <button aria-pressed={tab === 'people'} className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')} type="button"><Users size={15} /> Connections <span>{data?.people.length ?? 0}</span></button> : null}
            {tab === 'discover' ? (
              <select aria-label="Filter profiles" className="meet-filter" onChange={(event) => setFilter(event.target.value as 'all' | 'school')} value={filter}>
                <option value="all">All schools</option>
                <option disabled={!profile.school} value="school">My school</option>
              </select>
            ) : null}
          </nav>
          {tab === 'people' ? (
            <div className="meet-people">
              {data?.people.length ? data.people.map((person) => (
                <article className="meet-person panel" key={person.user_id}>
                  <span className="meet-person-avatar">{person.photo_urls[0] || person.avatar_url ? <img alt="" src={person.photo_urls[0] ?? person.avatar_url ?? ''} /> : person.display_name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{person.display_name}</strong><span>{person.school ?? 'Student community'}</span><p>{person.bio}</p></div>
                  <span className="meet-mutual-badge">You both said hello</span>
                  <button className="meet-message-button" disabled={chatBusy} onClick={() => void openChat(person)} type="button"><MessageCircle size={15} /> Message</button>
                </article>
              )) : <div className="meet-empty panel"><Users size={28} /><h2>Your connections will show here</h2><p>When someone you say hello to says hello back, you’ll see them here.</p><button className="secondary-button" onClick={() => setTab('discover')} type="button">Discover people</button></div>}
            </div>
          ) : (
            candidate ? (
              <article className="meet-card panel">
                <div className="meet-card-photo">
                  {photos.length ? <img alt={`${candidate.display_name}'s profile`} src={photos[currentPhoto] ?? photos[0]} /> : <div className="meet-photo-placeholder">{candidate.display_name.slice(0, 1).toUpperCase()}</div>}
                  {photos.length > 1 ? (
                    <>
                      <button aria-label="Previous photo" className="meet-photo-arrow left" onClick={() => setCurrentPhoto((current) => (current + photos.length - 1) % photos.length)} type="button"><ChevronLeft size={20} /></button>
                      <button aria-label="Next photo" className="meet-photo-arrow right" onClick={() => setCurrentPhoto((current) => (current + 1) % photos.length)} type="button"><ChevronRight size={20} /></button>
                      <div className="meet-photo-dots">{photos.map((photo, index) => <button aria-label={`Show photo ${index + 1}`} aria-pressed={index === currentPhoto} key={photo} onClick={() => setCurrentPhoto(index)} type="button" />)}</div>
                    </>
                  ) : null}
                </div>
                <div className="meet-card-info">
                  <div className="meet-card-title"><div><h2>{candidate.display_name}</h2><p>{[candidate.school, candidate.course, candidate.year].filter(Boolean).join(' · ') || 'Student community'}</p></div>{session && !data?.demoContent ? <button aria-label="Skip this profile" className="meet-pass" disabled={busy} onClick={pass} type="button"><X size={20} /></button> : null}</div>
                  <p className="meet-bio">{candidate.bio || 'Say hello and learn more about each other.'}</p>
                  <div className="meet-tags">{candidate.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
                  {data?.demoContent ? (
                    <p className="meet-demo-note">Sample profile · interactions are disabled.</p>
                  ) : session ? (
                    <div className="meet-actions">
                      <button aria-label="Skip" className="meet-action pass" disabled={busy} onClick={pass} type="button"><X size={21} /></button>
                      <button className="meet-like" disabled={busy} onClick={() => void like(candidate.user_id)} type="button"><Heart size={18} /> Say hello</button>
                      <button aria-label="Send a wave" className="meet-action super-like" disabled={busy} onClick={() => void like(candidate.user_id, true)} type="button"><Star size={20} /></button>
                    </div>
                  ) : <button className="primary-button" onClick={onRequireAccount} type="button">Sign in to say hello</button>}
                  <p className="meet-privacy-note">Only students who opt in appear here. You control when your profile is visible.</p>
                </div>
              </article>
            ) : (
              <div className="meet-empty panel"><Heart size={28} /><h2>{filter === 'school' ? 'No profiles from your school yet' : 'You’re all caught up'}</h2><p>Check back later for more people who chose to be discoverable.</p><button className="secondary-button" onClick={() => { setSkipped([]); setFilter('all'); }} type="button">Refresh profiles</button></div>
            )
          )}
        </>
      )}
      {activeChat ? (
        <div aria-label={`Chat with ${activeChat.profile.display_name}`} aria-modal="true" className="meet-chat-backdrop" role="dialog">
          <section className="meet-chat">
            <header>
              <div>
                <span className="meet-person-avatar">{activeChat.profile.photo_urls[0] || activeChat.profile.avatar_url ? <img alt="" src={activeChat.profile.photo_urls[0] ?? activeChat.profile.avatar_url ?? ''} /> : activeChat.profile.display_name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{activeChat.profile.display_name}</strong><small>Your messages are private to this conversation.</small></div>
              </div>
              <button aria-label="Close chat" onClick={() => setActiveChat(null)} type="button"><X size={18} /></button>
            </header>
            <div className="meet-chat-messages">
              {activeChat.messages.map((message) => <div className={message.sender_id === profile.id ? 'meet-chat-message mine' : 'meet-chat-message'} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>)}
              {!activeChat.messages.length ? <p className="meet-chat-empty">Say hello to start the conversation.</p> : null}
              <div ref={chatEndRef} />
            </div>
            <form className="meet-chat-form" onSubmit={(event) => void sendMessage(event)}>
              <input autoComplete="off" maxLength={4000} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message…" value={chatDraft} />
              <button aria-label="Send message" disabled={!chatDraft.trim() || chatBusy} type="submit"><Send size={16} /></button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
