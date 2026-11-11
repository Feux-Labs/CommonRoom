'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoReelEditor } from '@/components/PhotoReelEditor';
import { ReelEditor } from '@/components/ReelEditor';
import { AnonAvatar, UserAvatar } from '@/components/cr/Avatars';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { Icon } from '@/components/cr/Icon';
import { ProgressBar } from '@/components/cr/primitives';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { mediaExtension, removeUserMedia, uploadUserMedia } from '@/features/app/media';
import { ANON_POST_MAX, ANON_TOPICS, type AnonIdentity, type AnonTopic } from '@/features/anonymous/api';
import { AnonymousNameSheet } from '@/features/anonymous/AnonymousNameSheet';
import type { Audience, MediaItem } from '@/lib/contracts';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, compressMedia, readVideoDuration } from '@/lib/media-compression';

export type CreateDestination = 'room' | 'anonymous';

type Draft = Partial<{ caption: string; topic: AnonTopic; cardTheme: CardTheme; isPoll: boolean; pollOptions: string[]; location: string; audience: Audience }>;

/** A saved draft with some text in it, or null. Safe when storage is blocked or the data is damaged. */
function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    const draft = raw ? (JSON.parse(raw) as Draft) : null;
    return draft && typeof draft.caption === 'string' && draft.caption.trim() ? draft : null;
  } catch {
    return null;
  }
}
type MediaKind = 'photo' | 'video' | null;

const ROOM_POST_MAX = 500;
type CardTheme = 'blue-hour' | 'soft-sky' | 'warm-glow' | 'rose-note';
export const CARD_THEMES: { id: CardTheme; label: string }[] = [
  { id: 'blue-hour', label: 'Blue hour' },
  { id: 'soft-sky', label: 'Soft sky' },
  { id: 'warm-glow', label: 'Warm glow' },
  { id: 'rose-note', label: 'Rose note' },
];
const ROOM_MAX_PHOTOS = 10;
const ANON_MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** Mockups 12, 13, 77 and 78: create a Room post or an anonymous post. */
export function CreatePost({ destination }: { destination: CreateDestination }) {
  const router = useRouter();
  const toast = useToast();
  const { account: member, session, profile } = useAppSession();
  const anonymous = destination === 'anonymous';
  // Anonymous posts are open to guests too; Room posts need a signed-in member.
  const account = anonymous ? session : member;
  const maxLength = anonymous ? ANON_POST_MAX : ROOM_POST_MAX;
  const draftKey = `commonroom:draft:${destination}`;
  // The composer only renders on the client once the session is ready, so reading storage in the initial state is safe.
  const [draft] = useState(() => (typeof window === 'undefined' ? null : readDraft(draftKey)));

  const [caption, setCaption] = useState(draft?.caption?.slice(0, maxLength) ?? '');
  const [topic, setTopic] = useState<AnonTopic>(draft?.topic && ANON_TOPICS.includes(draft.topic) ? draft.topic : 'Campus life');
  const [sensitive, setSensitive] = useState(false);
  const [cardTheme, setCardTheme] = useState<CardTheme>(CARD_THEMES.some((theme) => theme.id === draft?.cardTheme) ? (draft?.cardTheme as CardTheme) : 'blue-hour');
  const [draftRestored, setDraftRestored] = useState(Boolean(draft));
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<MediaKind>(null);
  const [isPoll, setIsPoll] = useState(!anonymous && Boolean(draft?.isPoll));
  const [pollOptions, setPollOptions] = useState<string[]>(!anonymous && Array.isArray(draft?.pollOptions) && draft.pollOptions.length >= 2 ? draft.pollOptions.slice(0, 6).map(String) : ['', '']);
  const [audience, setAudience] = useState<Audience>(!anonymous && (draft?.audience === 'Followers' || draft?.audience === 'Private') ? draft.audience : 'Public');
  const [location, setLocation] = useState(!anonymous ? draft?.location?.slice(0, 120) ?? '' : '');
  const [soundName, setSoundName] = useState<string | null>(null);
  const [reelOpen, setReelOpen] = useState(false);
  const [photoReelOpen, setPhotoReelOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState<AnonIdentity | null>(null);
  const [identityState, setIdentityState] = useState<'loading' | 'ready' | 'missing' | 'error'>(anonymous ? 'loading' : 'ready');
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Drafts: text and options are saved on this device while typing. Photos and video are not kept.
  const clearDraft = () => {
    try { window.localStorage.removeItem(draftKey); } catch { /* storage blocked: nothing to clear */ }
  };
  useEffect(() => {
    if (publishing) return;
    const timer = window.setTimeout(() => {
      try {
        if (!caption.trim()) window.localStorage.removeItem(draftKey);
        else window.localStorage.setItem(draftKey, JSON.stringify({ caption, topic, cardTheme, isPoll, pollOptions, location, audience, savedAt: Date.now() }));
      } catch { /* storage blocked: drafts are best effort */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [audience, caption, cardTheme, draftKey, isPoll, location, pollOptions, publishing, topic]);

  useEffect(() => {
    if (!anonymous || !account) return;
    let active = true;
    apiRequest<AnonIdentity | null>('/api/v1/anonymous/identity', { session: account })
      .then((result) => {
        if (!active) return;
        setIdentity(result);
        setIdentityState(result ? 'ready' : 'missing');
      })
      .catch(() => { if (active) setIdentityState('error'); });
    return () => { active = false; };
  }, [account, anonymous]);

  const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const hasContent = caption.trim().length > 0 || files.length > 0;
  const pollInvalid = isPoll && validPollOptions.length < 2;
  const canPost = Boolean(account) && hasContent && !publishing && !pollInvalid && caption.length <= maxLength
    && (!anonymous || identityState === 'ready' || identityState === 'missing');
  const dirty = hasContent || (isPoll && validPollOptions.length > 0);

  const close = () => {
    if (dirty && !publishing) {
      setConfirmLeave(true);
      return;
    }
    router.push(anonymous ? '/anonymous' : '/room');
  };

  const pickFiles = async (selected: File[], nextKind: Exclude<MediaKind, null>) => {
    if (!selected.length) return;
    const allowed = nextKind === 'photo' ? PHOTO_TYPES : VIDEO_TYPES;
    if (selected.some((file) => !allowed.includes(file.type) || !mediaExtension(file))) {
      setError(nextKind === 'photo' ? 'This file type isn’t supported. Use JPG, PNG or WebP.' : 'This file type isn’t supported. Use MP4, MOV or WebM.');
      return;
    }
    if (nextKind === 'video') {
      const seconds = await readVideoDuration(selected[0]).catch(() => Number.NaN);
      if (!Number.isFinite(seconds)) {
        setError('This video could not be read. Try a different file.');
        return;
      }
      if (seconds > MAX_VIDEO_SECONDS + 0.25) {
        setError(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds. This one is ${Math.ceil(seconds)} seconds. Trim it and try again.`);
        return;
      }
    }
    const merged = kind === nextKind ? [...files, ...selected] : selected;
    const limit = nextKind === 'video' ? 1 : anonymous ? ANON_MAX_PHOTOS : ROOM_MAX_PHOTOS;
    if (merged.length > limit) {
      setError(nextKind === 'video' ? 'A post can have one video.' : `Choose up to ${limit} photos.`);
      return;
    }
    setError('');
    setKind(nextKind);
    setFiles(merged);
    setSoundName(null);
    setIsPoll(false);
  };

  const openPicker = (nextKind: Exclude<MediaKind, null>) => {
    const input = fileInput.current;
    if (!input) return;
    input.accept = (nextKind === 'photo' ? PHOTO_TYPES : VIDEO_TYPES).join(',');
    input.multiple = nextKind === 'photo';
    input.dataset.kind = nextKind;
    input.click();
  };

  const removeFile = (index: number) => {
    setFiles((current) => {
      const next = current.filter((_, position) => position !== index);
      if (!next.length) setKind(null);
      return next;
    });
    setSoundName(null);
    setError('');
  };

  const compressAll = async (onProgress: (value: number) => void) => {
    const output: File[] = [];
    for (const [index, original] of files.entries()) {
      const file = await compressMedia(original, (value) => onProgress(((index + value / 100) / files.length) * 50));
      const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
      if (file.size > limit) throw new Error(`${original.name} is still too large after compression.`);
      output.push(file);
    }
    return output;
  };

  const publishRoom = async () => {
    if (!account) return;
    const uploadedPaths: string[] = [];
    try {
      const prepared = await compressAll(setProgress);
      const mediaItems: MediaItem[] = [];
      for (const [index, file] of prepared.entries()) {
        const uploaded = await uploadUserMedia(account, file);
        uploadedPaths.push(uploaded.path);
        mediaItems.push({ uri: uploaded.url, mediaType: file.type.startsWith('video/') ? 'video' : 'photo' });
        setProgress(50 + ((index + 1) / prepared.length) * 45);
      }
      setProgress(prepared.length ? 98 : null);
      await apiRequest('/api/v1/posts', {
        session: account,
        method: 'POST',
        body: {
          caption: caption.trim(),
          mediaItems,
          mediaType: isPoll ? 'poll' : kind ?? 'text',
          selectedSound: soundName,
          pollOptions: isPoll ? validPollOptions : [],
          audience,
          location: location.trim(),
        },
      });
      toast.show('Posted');
      clearDraft();
      router.push('/room');
    } catch (publishError) {
      await removeUserMedia(uploadedPaths);
      throw publishError;
    }
  };

  const publishAnonymous = async (activeIdentity: AnonIdentity) => {
    if (!account || !activeIdentity) return;
    const uploadedPaths: string[] = [];
    try {
      const prepared = await compressAll(setProgress);
      const mediaItems: { path: string; mediaType: 'photo' | 'video'; sensitive?: boolean }[] = [];
      for (const [index, file] of prepared.entries()) {
        const { path } = await uploadUserMedia(account, file, '', 'anonymous');
        uploadedPaths.push(path);
        mediaItems.push({ path, mediaType: file.type.startsWith('video/') ? 'video' : 'photo', ...(sensitive ? { sensitive: true } : {}) });
        setProgress(50 + ((index + 1) / prepared.length) * 45);
      }
      setProgress(prepared.length ? 98 : null);
      const created = await apiRequest<{ id: string }>('/api/v1/anonymous/posts', {
        session: account,
        method: 'POST',
        body: { scope: 'all_nigerian_schools', title: topic, body: caption.trim(), mediaItems, cardTheme },
      });
      toast.show('Posted anonymously');
      clearDraft();
      router.push(`/anonymous?posted=${encodeURIComponent(created.id)}`);
    } catch (publishError) {
      await removeUserMedia(uploadedPaths);
      throw publishError;
    }
  };

  const submit = async (event?: FormEvent<HTMLFormElement>, readyIdentity?: AnonIdentity) => {
    event?.preventDefault();
    if (!canPost && !readyIdentity) return;
    const activeIdentity = readyIdentity ?? identity;
    if (anonymous && !activeIdentity) {
      setNameSheetOpen(true);
      return;
    }
    setPublishing(true);
    setError('');
    setProgress(files.length ? 0 : null);
    try {
      if (anonymous && activeIdentity) await publishAnonymous(activeIdentity);
      else await publishRoom();
    } catch (publishError) {
      setError(errorMessage(publishError, 'Your post could not be published. Try again.'));
      setProgress(null);
      setPublishing(false);
    }
  };

  const remaining = maxLength - caption.length;
  const title = anonymous ? 'New anonymous post' : null;

  return (
    <div className="cr-app">
      <main className="cr-screen cr-screen--nonav cr-create" aria-label={anonymous ? 'New anonymous post' : 'New post'}>
        <form noValidate onSubmit={(event) => void submit(event)}>
          <header className="cr-hd">
            <button aria-label="Close" className="cr-icon-btn" onClick={close} type="button"><Icon name="x" /></button>
            {title ? <span className="cr-hd__t">{title}</span> : <span />}
            <button className="cr-pbtn" disabled={!canPost} type="submit">
              {publishing ? (progress !== null && progress < 98 ? `${Math.round(progress)}%` : 'Posting…') : 'Post'}
            </button>
          </header>

          {anonymous ? <p className="cr-create__note">Never linked to your profile.</p> : null}
          {anonymous && identityState === 'error' ? (
            <p className="cr-msg cr-msg--e" role="alert">We couldn’t check your anonymous name. You can still try to post.</p>
          ) : null}

          <div className="cr-create__compose">
            {anonymous ? <AnonAvatar /> : <UserAvatar name={profile?.displayName} src={profile?.avatarUrl} />}
            <textarea
              aria-label={anonymous ? 'Say it anonymously' : 'What’s happening on campus?'}
              className="cr-bare-textarea"
              disabled={publishing}
              maxLength={maxLength}
              onChange={(event) => setCaption(event.target.value)}
              placeholder={anonymous ? 'Say it anonymously…' : 'What’s happening on campus?'}
              ref={textareaRef}
              rows={4}
              value={caption}
            />
          </div>

          {draftRestored ? (
            <p className="cr-note cr-create__draft" role="status">
              Draft restored. Photos and video aren’t saved in drafts.{' '}
              <button className="cr-link" onClick={() => { setCaption(''); setDraftRestored(false); clearDraft(); }} type="button">Discard draft</button>
            </p>
          ) : null}

          {anonymous && files.length === 0 ? (
            <div className="cr-create__card">
              <div className={`cr-tcard cr-tcard--${cardTheme} cr-tcard--${caption.length > 160 ? 'sm' : caption.length > 80 ? 'md' : 'lg'}`} aria-label="Preview of your post card">
                {caption.trim() || 'Your words appear here'}
              </div>
              <div className="cr-create__themes" role="radiogroup" aria-label="Card style">
                {CARD_THEMES.map((theme) => (
                  <button aria-checked={cardTheme === theme.id} aria-label={theme.label} className={`cr-create__swatch cr-tcard--${theme.id}`} disabled={publishing} key={theme.id} onClick={() => setCardTheme(theme.id)} role="radio" type="button" />
                ))}
              </div>
            </div>
          ) : null}

          {files.length ? (
            <div className="cr-create__media">
              {files.map((file, index) => (
                <div className="cr-create__thumb" key={`${file.name}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  {kind === 'video' ? <video muted playsInline preload="metadata" src={previews[index]} /> : <img alt="" src={previews[index]} />}
                  {!publishing ? (
                    <button aria-label={`Remove ${file.name}`} className="cr-create__remove" onClick={() => removeFile(index)} type="button"><Icon name="x" /></button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {publishing && progress !== null ? (
            <div className="cr-create__progress" role="status">
              <ProgressBar label="Upload progress" value={progress} />
              <p className="cr-note">Uploading {Math.round(progress)}%. Your post goes live when it finishes.</p>
            </div>
          ) : null}

          {error ? (
            <div className="cr-create__error" role="alert">
              <span>{error}</span>
              {!publishing && hasContent ? <button className="cr-link" onClick={() => void submit()} type="button">Try again</button> : null}
            </div>
          ) : null}

          {!anonymous && kind === 'video' && files.length === 1 && !publishing ? (
            <button className="cr-ghost cr-create__extra" onClick={() => setReelOpen(true)} type="button"><Icon name="vid" />{soundName ? `Sound: ${soundName}` : 'Trim or add sound'}</button>
          ) : null}
          {!anonymous && kind === 'photo' && files.length > 0 && !publishing ? (
            <button className="cr-ghost cr-create__extra" onClick={() => setPhotoReelOpen(true)} type="button"><Icon name="vid" />Make a video from photos</button>
          ) : null}

          {isPoll ? (
            <fieldset className="cr-create__poll" disabled={publishing}>
              <legend className="cr-label">Poll options</legend>
              {pollOptions.map((option, index) => (
                <div className="cr-create__poll-row" key={index}>
                  <div className="cr-input">
                    <input aria-label={`Option ${index + 1}`} maxLength={100} onChange={(event) => setPollOptions((current) => current.map((value, position) => (position === index ? event.target.value : value)))} placeholder={`Option ${index + 1}`} value={option} />
                  </div>
                  {pollOptions.length > 2 ? (
                    <button aria-label={`Remove option ${index + 1}`} className="cr-icon-btn" onClick={() => setPollOptions((current) => current.filter((_, position) => position !== index))} type="button"><Icon name="x" /></button>
                  ) : null}
                </div>
              ))}
              {pollOptions.length < 6 ? <button className="cr-link" onClick={() => setPollOptions((current) => [...current, ''])} type="button">Add option</button> : null}
            </fieldset>
          ) : null}

          <hr className="cr-hr" />

          {anonymous ? (
            <>
              <span className="cr-label" id="cr-topic-label">Topic</span>
              <div aria-labelledby="cr-topic-label" className="cr-chips" role="radiogroup">
                {ANON_TOPICS.map((item) => (
                  <button aria-checked={topic === item} className={topic === item ? 'cr-chip on' : 'cr-chip'} disabled={publishing} key={item} onClick={() => setTopic(item)} role="radio" type="button">{item}</button>
                ))}
              </div>
              <div className="cr-create__tools">
                <button className="cr-ghost cr-ghost--l" disabled={publishing || files.length >= ANON_MAX_PHOTOS} onClick={() => openPicker('photo')} type="button"><Icon name="img" />Add photo</button>
              </div>
              {files.length ? (
                <label className="cr-sens-opt">
                  <input checked={sensitive} disabled={publishing} onChange={(event) => setSensitive(event.target.checked)} type="checkbox" />
                  <span>This photo is sensitive. People tap to view it.</span>
                </label>
              ) : null}
            </>
          ) : (
            <>
              <div className="cr-create__tools">
                <button className="cr-ghost cr-ghost--l" disabled={publishing || kind === 'video' || isPoll} onClick={() => openPicker('photo')} type="button"><Icon name="img" />Photo</button>
                <button className="cr-ghost cr-ghost--l" disabled={publishing || kind === 'photo' || isPoll} onClick={() => openPicker('video')} type="button"><Icon name="vid" />Video</button>
                <button aria-pressed={isPoll} className={isPoll ? 'cr-ghost cr-ghost--l is-on' : 'cr-ghost cr-ghost--l'} disabled={publishing || files.length > 0} onClick={() => setIsPoll((value) => !value)} type="button">Poll</button>
              </div>
              <label className="cr-label" htmlFor="cr-create-location">Location (optional)</label>
              <div className="cr-input">
                <input disabled={publishing} id="cr-create-location" maxLength={120} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Faculty of Science" value={location} />
              </div>
              <label className="cr-label" htmlFor="cr-create-audience">Who can see this</label>
              <select className="cr-select" disabled={publishing} id="cr-create-audience" onChange={(event) => setAudience(event.target.value as Audience)} value={audience}>
                <option value="Public">Everyone</option>
                <option value="Followers">Followers</option>
                <option value="Private">Only me</option>
              </select>
            </>
          )}

          <div className="cr-sp cr-create__foot">
            <span className="cr-cnt">{anonymous ? 'Follows Community Guidelines' : 'Add #tags to help people find this'}</span>
            <span aria-live="polite" className={remaining < 0 ? 'cr-cnt cr-msg--e' : 'cr-cnt'}>{caption.length} / {maxLength}</span>
          </div>
          {anonymous ? <p className="cr-note">You can delete a post later, but not edit it.</p> : null}
        </form>

        <input
          className="cr-visually-hidden"
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? []);
            const nextKind = (event.currentTarget.dataset.kind as Exclude<MediaKind, null>) ?? 'photo';
            event.currentTarget.value = '';
            void pickFiles(selected, nextKind);
          }}
          ref={fileInput}
          tabIndex={-1}
          type="file"
        />
      </main>

      {reelOpen && kind === 'video' && files[0] ? (
        <ReelEditor
          file={files[0]}
          onClose={() => setReelOpen(false)}
          onExport={(edited, sound) => { setFiles([edited]); setSoundName(sound); setReelOpen(false); }}
        />
      ) : null}
      {photoReelOpen && kind === 'photo' && files.length ? (
        <PhotoReelEditor
          files={files}
          onClose={() => setPhotoReelOpen(false)}
          onExport={(edited, sound) => { setFiles([edited]); setKind('video'); setSoundName(sound); setPhotoReelOpen(false); }}
        />
      ) : null}

      <AnonymousNameSheet
        onClose={() => setNameSheetOpen(false)}
        onSaved={(saved) => {
          setIdentity(saved);
          setIdentityState('ready');
          setNameSheetOpen(false);
          void submit(undefined, saved);
        }}
        open={nameSheetOpen}
      />

      <BottomSheet
        description="Your post will be lost."
        onClose={() => setConfirmLeave(false)}
        open={confirmLeave}
        title="Discard this post?"
      >
        <div className="cr-acts">
          <button className="cr-ghost cr-ghost--l" onClick={() => setConfirmLeave(false)} type="button">Keep editing</button>
          <button className="cr-pbtn cr-pbtn--l" onClick={() => { clearDraft(); router.push(anonymous ? '/anonymous' : '/room'); }} type="button">Discard</button>
        </div>
      </BottomSheet>
    </div>
  );
}
