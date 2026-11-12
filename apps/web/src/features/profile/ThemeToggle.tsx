'use client';

import { useEffect, useState } from 'react';
import { applyTheme, readTheme } from '@/lib/theme';

function resolved(): 'light' | 'dark' {
  const chosen = readTheme();
  if (chosen !== 'system') return chosen;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Moon in light mode, sun in dark mode: one tap switches. "Auto" is still available in Settings. */
export function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) setMode(resolved()); })();
    return () => { active = false; };
  }, []);
  const flip = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    applyTheme(next);
  };
  return (
    <button aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="cr-icon-btn" onClick={flip} type="button">
      {mode === 'dark' ? (
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
