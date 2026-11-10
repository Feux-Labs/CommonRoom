'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import '@/styles/sensitive.css';

/**
 * Hides sensitive media behind a blur with a warning, like X/Twitter. Tapping "I know, show it" opens it, and the
 * little eye button puts it back. Nothing is deleted: this is only a gate in front of the picture or video.
 * `fill` makes the gate cover its parent (for full-screen viewers).
 */
export function SensitiveGate({ active, children, fill = false }: { active: boolean; children: ReactNode; fill?: boolean }) {
  const [shown, setShown] = useState(false);
  if (!active) return <>{children}</>;
  const hidden = !shown;
  return (
    <div className={`cr-sens${fill ? ' cr-sens--fill' : ''}${hidden ? ' is-hidden' : ''}`}>
      <div aria-hidden={hidden} className="cr-sens__media" inert={hidden}>{children}</div>
      {hidden ? (
        <div className="cr-sens__cover" role="group" aria-label="Sensitive content warning">
          <span aria-hidden="true" className="cr-sens__eye"><Icon name="eyeoff" /></span>
          <b>Sensitive content</b>
          <span>This may contain explicit content.</span>
          <button className="cr-sens__show" onClick={() => setShown(true)} type="button">I know, show it</button>
        </div>
      ) : (
        <button aria-label="Hide sensitive content" className="cr-sens__hide" onClick={() => setShown(false)} type="button"><Icon name="eyeoff" /></button>
      )}
    </div>
  );
}
