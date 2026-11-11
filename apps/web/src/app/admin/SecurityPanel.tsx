'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adminCall } from './adminApi';
import './admin-extra.css';

type Row = { at: string; kind: string; method: string | null; path: string | null; query: string | null; ip: string | null; userAgent: string | null; country: string | null; userId: string | null; status: number | null; flag: string | null };
type Security = {
  window: string;
  summary: { requests: number; distinctIps: number; attackAttempts: number; scriptRequests: number; failedSignIns: number; staffDenied: number; rateLimited: number };
  topEndpoints: Array<{ method: string; path: string; calls: number; ips: number }>;
  topIps: Array<{ ip: string; calls: number; country: string | null; flagged: number; failed: number }>;
  attacks: Row[];
  scripts: Array<{ flag: string; ip: string | null; userAgent: string | null; calls: number; lastPath: string | null }>;
  failedAuth: Array<{ ip: string | null; calls: number; paths: string | null }>;
  staffDenied: Row[];
  recent: Row[];
};

const WINDOWS = [['1h', 'Last hour'], ['24h', '24 hours'], ['7d', '7 days']] as const;
const time = (iso: string) => new Date(iso).toLocaleString();

/** Admin "Security" tab: which endpoints are being called, curl and script traffic, and anything that looks like an attack. */
export function SecurityPanel({ session }: { session: Session }) {
  const [window, setWindow] = useState<(typeof WINDOWS)[number][0]>('24h');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Security | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (q: string) => {
    try {
      setData(await adminCall<Security>(session, `/api/v1/admin/security?window=${window}&q=${encodeURIComponent(q)}`));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the log.');
    }
  }, [session, window]);

  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) await load(''); })();
    return () => { active = false; };
  }, [load]);

  const s = data?.summary;
  const flagClass = (flag: string | null) => (flag?.startsWith('attack') ? 'adm-flag' : 'adm-flag adm-flag--script');

  return (
    <section className="admin-panel admin-section">
      <header>
        <div><h2>Security and API monitor</h2></div>
        <div aria-label="Window" className="adm-seg" role="tablist">
          {WINDOWS.map(([key, label]) => <button aria-selected={window === key} key={key} onClick={() => setWindow(key)} role="tab" type="button">{label}</button>)}
        </div>
      </header>
      <p className="admin-muted">Every API call is recorded with where it came from. “Attack” rows match known attack patterns; “script” rows are curl, scripts and tools that are not a normal browser. These are signals, not proof: look at the IP and what it called.</p>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {!data && !error ? <p className="admin-muted">Loading…</p> : null}

      {data && s ? (
        <>
          <div className="adm-tiles">
            <div><span>API requests</span><b>{s.requests.toLocaleString()}</b><small>{s.distinctIps.toLocaleString()} different IPs</small></div>
            <div className={s.attackAttempts > 0 ? 'adm-danger' : undefined}><span>Attack-looking requests</span><b>{s.attackAttempts.toLocaleString()}</b><small>SQL, script, path and file probing</small></div>
            <div><span>Curl and script requests</span><b>{s.scriptRequests.toLocaleString()}</b><small>Not a normal browser</small></div>
            <div><span>Failed sign-ins</span><b>{s.failedSignIns.toLocaleString()}</b><small>Missing or bad session</small></div>
            <div className={s.staffDenied > 0 ? 'adm-danger' : undefined}><span>Admin access denied</span><b>{s.staffDenied.toLocaleString()}</b><small>Someone without the role tried</small></div>
            <div><span>Rate limited</span><b>{s.rateLimited.toLocaleString()}</b><small>Too many requests</small></div>
          </div>

          <h3 className="adm-h3">Suspected attacks</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>When</th><th>IP</th><th>Request</th><th>Why</th></tr></thead>
            <tbody>{data.attacks.length === 0 ? <tr><td colSpan={4}>None in this window.</td></tr> : data.attacks.map((row, index) => (
              <tr key={index}><td>{time(row.at)}</td><td>{row.ip ?? '—'}<br /><small>{row.country ?? ''}</small></td><td className="adm-code">{row.method} {row.path}{row.query ? `?${row.query}` : ''}</td><td><span className={flagClass(row.flag)}>{row.flag}</span></td></tr>
            ))}</tbody>
          </table></div>

          <h3 className="adm-h3">Curl, scripts and tools</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>Client</th><th>IP</th><th>Calls</th><th>Last endpoint</th><th>User agent</th></tr></thead>
            <tbody>{data.scripts.length === 0 ? <tr><td colSpan={5}>None in this window.</td></tr> : data.scripts.map((row, index) => (
              <tr key={index}><td><span className="adm-flag adm-flag--script">{row.flag.replace('script: ', '')}</span></td><td>{row.ip ?? '—'}</td><td>{row.calls}</td><td className="adm-code">{row.lastPath}</td><td className="adm-code">{row.userAgent || '(none)'}</td></tr>
            ))}</tbody>
          </table></div>

          <h3 className="adm-h3">Busiest IPs</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>IP</th><th>Country</th><th>Requests</th><th>Flagged</th><th>Failed auth</th></tr></thead>
            <tbody>{data.topIps.map((row) => <tr key={row.ip}><td>{row.ip}</td><td>{row.country ?? '—'}</td><td>{row.calls}</td><td>{row.flagged}</td><td>{row.failed}</td></tr>)}</tbody>
          </table></div>

          <h3 className="adm-h3">Most-called endpoints</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>Endpoint</th><th>Calls</th><th>IPs</th></tr></thead>
            <tbody>{data.topEndpoints.map((row, index) => <tr key={index}><td className="adm-code">{row.method} {row.path}</td><td>{row.calls}</td><td>{row.ips}</td></tr>)}</tbody>
          </table></div>

          <h3 className="adm-h3">Failed sign-ins by IP</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>IP</th><th>Failures</th><th>Endpoints</th></tr></thead>
            <tbody>{data.failedAuth.length === 0 ? <tr><td colSpan={3}>None.</td></tr> : data.failedAuth.map((row, index) => <tr key={index}><td>{row.ip ?? '—'}</td><td>{row.calls}</td><td className="adm-code">{row.paths}</td></tr>)}</tbody>
          </table></div>

          <h3 className="adm-h3">Admin access denied</h3>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>When</th><th>IP</th><th>Endpoint</th><th>Account</th><th>Reason</th></tr></thead>
            <tbody>{data.staffDenied.length === 0 ? <tr><td colSpan={5}>None.</td></tr> : data.staffDenied.map((row, index) => <tr key={index}><td>{time(row.at)}</td><td>{row.ip ?? '—'}</td><td className="adm-code">{row.method} {row.path}</td><td className="adm-code">{row.userId ?? '—'}</td><td>{row.flag}</td></tr>)}</tbody>
          </table></div>

          <h3 className="adm-h3">Search recent requests</h3>
          <form className="adm-form" onSubmit={(event) => { event.preventDefault(); void load(query); }} style={{ maxWidth: 520 }}>
            <label>Part of an endpoint, an IP, a user id or a user agent<input onChange={(event) => setQuery(event.target.value)} placeholder="e.g. /api/v1/admin or 102.89" value={query} /></label>
            <button className="admin-btn-action" type="submit">Search</button>
          </form>
          <div className="admin-table-wrap"><table>
            <thead><tr><th>When</th><th>Kind</th><th>IP</th><th>Request</th><th>Flag</th></tr></thead>
            <tbody>{data.recent.map((row, index) => (
              <tr key={index}><td>{time(row.at)}</td><td>{row.kind}</td><td>{row.ip ?? '—'}</td><td className="adm-code">{row.method} {row.path}{row.query ? `?${row.query}` : ''}</td><td>{row.flag ? <span className={flagClass(row.flag)}>{row.flag}</span> : ''}</td></tr>
            ))}</tbody>
          </table></div>
        </>
      ) : null}
    </section>
  );
}
