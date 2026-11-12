'use client';

import { useEffect, useState } from 'react';
import { adminCacheRead, adminCacheWrite } from './adminApi';
import type { Session } from '@supabase/supabase-js';

type Flag = { key: string; enabled: boolean; description: string; updatedAt: string };

async function flagsRequest<T>(session: Session, method: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/v1/admin/flags', {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok || !result?.data) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  return result.data;
}

/** Admin "Feature flags" tab: switch parts of the app on or off without a deploy. */
export function FlagsPanel({ session }: { session: Session }) {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const saved = adminCacheRead<{ flags: Flag[] }>(session, '/api/v1/admin/flags');
        if (saved && active) setFlags(saved.flags);
        const result = await flagsRequest<{ flags: Flag[] }>(session, 'GET');
        adminCacheWrite(session, '/api/v1/admin/flags', result);
        if (active) setFlags(result.flags);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the flags.');
      }
    })();
    return () => { active = false; };
  }, [session]);

  const toggle = async (flag: Flag) => {
    setBusy(flag.key);
    setError('');
    try {
      await flagsRequest(session, 'PUT', { key: flag.key, enabled: !flag.enabled });
      setFlags((current) => current?.map((item) => (item.key === flag.key ? { ...item, enabled: !flag.enabled } : item)) ?? null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save that change.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="admin-panel admin-section">
      <header><div><h2>Feature flags</h2></div></header>
      <p className="admin-muted">Turn parts of the app on or off. Takes about a minute.</p>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {flags === null && !error ? <p className="admin-muted">Loading…</p> : null}
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Flag</th><th>What it does</th><th>State</th></tr></thead>
          <tbody>
            {flags?.map((flag) => (
              <tr key={flag.key}>
                <td><code>{flag.key}</code></td>
                <td>{flag.description}</td>
                <td>
                  <button aria-pressed={flag.enabled} className="admin-btn-action" disabled={busy === flag.key} onClick={() => void toggle(flag)} type="button">
                    {flag.enabled ? 'On' : 'Off'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
