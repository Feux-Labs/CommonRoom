'use client';

import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { shortAge } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export type SheetComment = {
  id: string;
  parentId: string | null;
  author: string;
  avatar: ReactNode;
  body: string;
  createdAt: string;
};

/**
 * Mockups 14 and 15. One level of replies. Loading, error and empty states are
 * explicit; the composer stays pinned to the bottom of the sheet.
 */
function CommentsSheetBody({
  open,
  onClose,
  count,
  context,
  note,
  comments,
  status,
  onRetry,
  composerAvatar,
  placeholder,
  canCompose,
  composeDisabledReason,
  onSubmit,
  onReport,
  maxLength = 2000,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  context?: string;
  note?: string;
  comments: SheetComment[];
  status: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  composerAvatar: ReactNode;
  placeholder: string;
  canCompose: boolean;
  composeDisabledReason?: ReactNode;
  onSubmit: (body: string, parent: SheetComment | null) => Promise<void>;
  onReport?: (comment: SheetComment) => void;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<SheetComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const roots = comments.filter((comment) => !comment.parentId);
  const repliesFor = (id: string) => comments.filter((comment) => comment.parentId === id);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(body, replyTo);
      setDraft('');
      setReplyTo(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your comment could not be posted.');
    } finally {
      setBusy(false);
    }
  };

  const startReply = (comment: SheetComment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  const renderComment = (comment: SheetComment, isReply: boolean) => (
    <div className={isReply ? 'cr-cm cr-cm--reply' : 'cr-cm'} key={comment.id}>
      <span className="cr-cm__avatar">{comment.avatar}</span>
      <div className="cr-cm__main">
        <div className="cr-cm__who">{comment.author} <span className="cr-cm__age">{shortAge(comment.createdAt)}</span></div>
        <p className="cr-cm__body">{comment.body}</p>
        <div className="cr-cm__acts">
          {!isReply && canCompose ? <button onClick={() => startReply(comment)} type="button">Reply</button> : null}
          {onReport ? <button onClick={() => onReport(comment)} type="button">Report</button> : null}
        </div>
      </div>
    </div>
  );

  const footer = canCompose ? (
    <form className="cr-composer" onSubmit={(event) => void submit(event)}>
      {replyTo ? (
        <p className="cr-composer__reply">
          Replying to {replyTo.author}
          <button onClick={() => setReplyTo(null)} type="button">Cancel</button>
        </p>
      ) : null}
      {error ? <p className="cr-msg cr-msg--e" role="alert">{error}</p> : null}
      <div className="cr-composer__row">
        <span className="cr-composer__avatar">{composerAvatar}</span>
        <div className="cr-input cr-input--pill">
          <input
            aria-label={replyTo ? `Reply to ${replyTo.author}` : placeholder}
            disabled={busy}
            maxLength={maxLength}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.author}…` : placeholder}
            ref={inputRef}
            value={draft}
          />
        </div>
        <button aria-label="Send" className="cr-icon-btn" disabled={busy || !draft.trim()} type="submit"><Icon name="send" /></button>
      </div>
    </form>
  ) : composeDisabledReason ? <div className="cr-composer cr-composer--note">{composeDisabledReason}</div> : null;

  return (
    <BottomSheet
      context={context}
      description={note}
      footer={footer}
      full
      onClose={onClose}
      open={open}
      showClose
      title={`Comments · ${count}`}
    >
      {status === 'loading' ? (
        <div aria-busy="true" role="status">
          {[0, 1, 2].map((item) => (
            <div className="cr-cm" key={item}>
              <i className="cr-sk cr-sk--avatar" />
              <div style={{ flex: 1 }}><i className="cr-sk" style={{ width: 90, height: 10 }} /><i className="cr-sk" style={{ width: '80%', height: 10, marginTop: 8 }} /></div>
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="cr-listfoot" role="alert">
          <p>Couldn’t load comments.</p>
          <button className="cr-ghost cr-ghost--l" onClick={onRetry} type="button">Try again</button>
        </div>
      ) : roots.length === 0 ? (
        <p className="cr-empty-line">No comments yet. Start the conversation.</p>
      ) : (
        roots.map((comment) => (
          <div key={comment.id}>
            {renderComment(comment, false)}
            {repliesFor(comment.id).map((reply) => renderComment(reply, true))}
          </div>
        ))
      )}
    </BottomSheet>
  );
}

type CommentsSheetProps = Parameters<typeof CommentsSheetBody>[0];

/** Mounted only while open, so every opening starts with fresh state and nothing needs resetting. */
export function CommentsSheet(props: CommentsSheetProps) {
  return props.open ? <CommentsSheetBody {...props} /> : null;
}
