'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

type Growth = {
  active: { dau: number; wau: number; mau: number };
  last30Days: { guests: number; members: number };
  sources: Array<{ source: string; people: number }>;
  funnel: { opened: number; confirmed18: number; postedAnonymously: number; members: number };
};

/** Admin "Growth" tab: who is using the app, where they came from, and how far they get. Guests are counted too. */
export function GrowthPanel({ session }: { session: Session }) {
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const response = await fetch('/api/v1/admin/growth', { headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}` } });
        const body = (await response.json().catch(() => null)) as { data?: Growth; error?: { message?: string } } | null;
        if (!response.ok || !body?.data) throw new Error(body?.error?.message ?? `Request failed with status ${response.status}.`);
        if (active) setGrowth(body.data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load growth numbers.');
      }
    })();
    return () => { active = false; };
  }, [session]);

  return (
    <section className="admin-panel admin-section">
      <header><div><h2>Growth</h2></div></header>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {!growth && !error ? <p className="admin-muted">Loading…</p> : null}
      {growth ? (
        <>
          <p className="admin-muted">People counted by account id, guests included. A person who opens the app twice in a day counts once.</p>
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Active people</th><th>Count</th></tr></thead>
              <tbody>
                <tr><td>Today</td><td>{growth.active.dau}</td></tr>
                <tr><td>Last 7 days</td><td>{growth.active.wau}</td></tr>
                <tr><td>Last 30 days</td><td>{growth.active.mau}</td></tr>
                <tr><td>Guests (30 days)</td><td>{growth.last30Days.guests}</td></tr>
                <tr><td>Members (30 days)</td><td>{growth.last30Days.members}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Funnel</th><th>People</th></tr></thead>
              <tbody>
                <tr><td>Opened the app</td><td>{growth.funnel.opened}</td></tr>
                <tr><td>Confirmed 18+</td><td>{growth.funnel.confirmed18}</td></tr>
                <tr><td>Posted anonymously</td><td>{growth.funnel.postedAnonymously}</td></tr>
                <tr><td>Signed-up members</td><td>{growth.funnel.members}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Where people came from (?s= tag)</th><th>People</th></tr></thead>
              <tbody>
                {growth.sources.length === 0 ? <tr><td colSpan={2}>No tagged links yet. Share links like /anonymous?s=tiktok.</td></tr> : growth.sources.map((row) => (
                  <tr key={row.source}><td>{row.source}</td><td>{row.people}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
