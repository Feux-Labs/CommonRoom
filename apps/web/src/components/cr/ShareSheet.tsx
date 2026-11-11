'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { renderShareCard, withSource, type CardTheme } from '@/features/share/card';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { useToast } from './Toast';

/**
 * Share sheet (mockup 19). Copy link, WhatsApp, X, Facebook, Telegram, Messages, the phone's own
 * share sheet, and a story-size image with a small link line. Every link carries ?s=<channel>.
 */
export function ShareSheet({
  open,
  onClose,
  title = 'Share post',
  url,
  text,
  preview,
  context,
  card,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  url: string;
  text: string;
  preview?: ReactNode;
  context?: string;
  /** When set, a "Share image" and "Save image" option makes a 9:16 card from this text. */
  card?: { text: string; theme?: CardTheme; kicker?: string; question?: string };
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Only read when the sheet is open (client side), so there is nothing to sync.
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const link = (channel: string) => withSource(url, channel);
  const message = (channel: string) => `${text}\n${link(channel)}`.trim();
  const encode = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link('copy'));
      toast.show('Link copied');
      onClose();
    } catch {
      toast.show('Couldn’t copy the link. Copy it from your address bar.', 'error');
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url: link('native') });
      onClose();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.show('Sharing isn’t available here.', 'error');
    }
  };

  const makeCard = async (): Promise<File> => {
    const blob = await renderShareCard({ text: card?.text ?? text, theme: card?.theme, kicker: card?.kicker, question: card?.question, link: link('card') });
    return new File([blob], 'common-room.png', { type: 'image/png' });
  };

  const shareImage = async () => {
    if (!card || busy) return;
    setBusy(true);
    try {
      const file = await makeCard();
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: link('card') });
        onClose();
      } else {
        saveFile(file);
        toast.show('Image saved. Post it to your story.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.show('The image could not be made.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveImage = async () => {
    if (!card || busy) return;
    setBusy(true);
    try {
      saveFile(await makeCard());
      toast.show('Image saved');
    } catch {
      toast.show('The image could not be made.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet context={context} onClose={onClose} open={open} title={title}>
      {preview ? <div className="cr-pv">{preview}</div> : null}
      <div className="cr-shr cr-shr--wrap">
        <button onClick={() => void copy()} type="button"><b aria-hidden="true"><Icon name="copy" /></b>Copy link</button>
        <a href={`https://wa.me/?text=${encode(message('wa'))}`} onClick={onClose} rel="noopener noreferrer" target="_blank"><b aria-hidden="true">W</b>WhatsApp</a>
        <a href={`https://twitter.com/intent/tweet?text=${encode(text.slice(0, 200))}&url=${encode(link('x'))}`} onClick={onClose} rel="noopener noreferrer" target="_blank"><b aria-hidden="true">X</b>X</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encode(link('fb'))}`} onClick={onClose} rel="noopener noreferrer" target="_blank"><b aria-hidden="true">f</b>Facebook</a>
        <a href={`https://t.me/share/url?url=${encode(link('tg'))}&text=${encode(text.slice(0, 200))}`} onClick={onClose} rel="noopener noreferrer" target="_blank"><b aria-hidden="true">T</b>Telegram</a>
        <a href={`sms:?&body=${encode(message('sms'))}`} onClick={onClose}><b aria-hidden="true">M</b>Messages</a>
        {card ? <button disabled={busy} onClick={() => void shareImage()} type="button"><b aria-hidden="true"><Icon name="img" /></b>{busy ? 'Making…' : 'Share image'}</button> : null}
        {card ? <button disabled={busy} onClick={() => void saveImage()} type="button"><b aria-hidden="true"><Icon name="up" /></b>Save image</button> : null}
        {canNativeShare ? <button onClick={() => void nativeShare()} type="button"><b aria-hidden="true"><Icon name="more" /></b>More</button> : null}
      </div>
    </BottomSheet>
  );
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
