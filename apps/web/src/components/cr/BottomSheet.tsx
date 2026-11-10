'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal bottom sheet with a dimmed backdrop. Traps focus, closes on Escape or
 * backdrop click, locks page scroll and returns focus to the opener.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  full = false,
  showClose = false,
  context,
  footer,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Tall sheet (comments) instead of content height. */
  full?: boolean;
  showClose?: boolean;
  /** Small caption shown on the dimmed area above the sheet, e.g. "Post by @ife". */
  context?: ReactNode;
  /** Pinned below the scroll area (comment composer). */
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sheet = sheetRef.current;
    const first = sheet?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? sheet)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !sheet) return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="cr-sheet-layer">
      {/* Backdrop is pointer-only; keyboard users close with Escape or the sheet's own buttons. */}
      <div aria-hidden="true" className="cr-sheet-layer__backdrop" onClick={onClose} />
      {context ? <div className="cr-sheet-layer__context" aria-hidden="true">{context}</div> : null}
      <div
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        aria-modal="true"
        className={full ? 'cr-bsheet cr-bsheet--full' : 'cr-bsheet'}
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <span aria-hidden="true" className="cr-bsheet__grab" />
        {title || showClose ? (
          <div className="cr-bsheet__head">
            {title ? <h2 className="cr-bsheet__title" id={titleId}>{title}</h2> : <span />}
            {showClose ? (
              <button aria-label="Close" className="cr-icon-btn" onClick={onClose} type="button"><Icon name="x" /></button>
            ) : null}
          </div>
        ) : null}
        {description ? <p className="cr-bsheet__desc">{description}</p> : null}
        <div className="cr-bsheet__body">{children}</div>
        {footer ? <div className="cr-bsheet__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
