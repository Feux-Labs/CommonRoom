'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** Centered empty / error block (mockup 69, 70, 73, 74). */
export function StateBlock({
  icon,
  title,
  description,
  actions,
  role,
}: {
  icon: IconName;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  role?: 'alert' | 'status';
}) {
  return (
    <section className="cr-stateblock" role={role}>
      <span aria-hidden="true" className="cr-stateblock__icon"><Icon name={icon} /></span>
      <h2 className="cr-stateblock__title">{title}</h2>
      {description ? <p className="cr-stateblock__desc">{description}</p> : null}
      {actions ? <div className="cr-stateblock__actions">{actions}</div> : null}
    </section>
  );
}

export function ErrorBlock({ title = 'Couldn’t load your feed', description = 'Check your connection and try again.', onRetry }: { title?: string; description?: string; onRetry: () => void }) {
  return (
    <StateBlock
      actions={<button className="cr-pbtn cr-pbtn--l" onClick={onRetry} type="button">Try again</button>}
      description={description}
      icon="warn"
      role="alert"
      title={title}
    />
  );
}

/** Post-shaped skeletons (mockup 68). */
export function FeedSkeleton({ count = 2, media = true, label = 'Loading' }: { count?: number; media?: boolean; label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className="cr-skc" key={index}>
          <div className="cr-skc__row"><i className="cr-sk cr-sk--avatar" /><i className="cr-sk" style={{ width: 90, height: 10 }} /></div>
          <i className="cr-sk" style={{ width: '100%', height: 10, marginTop: 10 }} />
          <i className="cr-sk" style={{ width: '70%', height: 10, marginTop: 6 }} />
          {media ? <i className="cr-sk" style={{ width: '100%', height: 110, borderRadius: 14, marginTop: 10 }} /> : null}
        </div>
      ))}
    </div>
  );
}

/** Grid skeleton for Market (mockup 75). */
export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading listings" className="cr-g2" role="status">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <i className="cr-sk" style={{ display: 'block', height: 150, borderRadius: 16 }} />
          <i className="cr-sk" style={{ display: 'block', width: '80%', height: 10, marginTop: 8 }} />
          <i className="cr-sk" style={{ display: 'block', width: '40%', height: 10, marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}

/** Footer of an infinite list: loading more, failed (71), or end (72). Never shows "end" unless the server said so. */
export function ListFooter({
  loadingMore,
  failed,
  ended,
  onRetry,
  endLabel = 'You’re all caught up',
}: {
  loadingMore: boolean;
  failed: boolean;
  ended: boolean;
  onRetry: () => void;
  endLabel?: string;
}) {
  if (failed) {
    return (
      <div className="cr-listfoot" role="alert">
        <p>Couldn’t load more posts.</p>
        <button className="cr-ghost cr-ghost--l" onClick={onRetry} type="button">Try again</button>
      </div>
    );
  }
  if (loadingMore) return <div className="cr-listfoot" role="status"><span aria-hidden="true" className="cr-spinner cr-spinner--dark" /> <span className="cr-visually-hidden">Loading more</span></div>;
  if (ended) return <p className="cr-listfoot cr-listfoot__end">{endLabel}</p>;
  return null;
}
