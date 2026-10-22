'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { BarChart3, LogOut, Megaphone, ShieldCheck, Trash2, Users } from 'lucide-react';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

const ADMIN_EMAIL = 'ibitoyrgideon79@gmail.com';

type Analytics = {
  overview: Record<string, number>;
  recentUsers: Array<{
    id: string;
    displayName: string;
    username: string | null;
    school: string | null;
    joinedAt: string;
  }>;
  featureEngagement: Array<{ feature: string; count: number }>;
};

type ReportItem = {
  id: string;
  reason: string;
  details?: string;
  createdAt: string;
  post?: { caption: string; authorName: string } | null;
  listing?: { title: string; sellerName: string } | null;
};

type Reports = { postReports: ReportItem[]; marketplaceReports: ReportItem[] };
type Broadcast = { message: string; createdAt: string } | null;

async function adminRequest<T>(session: Session, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  if (!result || !('data' in result)) throw new Error('The admin service returned an invalid response.');
  return result.data as T;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [dashboardLoading, setDashboardLoading] = useState(() => isSupabaseConfigured());
  const [password, setPassword] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [broadcast, setBroadcast] = useState<Broadcast>(null);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const configured = isSupabaseConfigured();
  const supabase = configured ? getBrowserSupabase() : null;

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError('');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const authorized = Boolean(session?.user.email_confirmed_at
    && session.user.email?.trim().toLowerCase() === ADMIN_EMAIL);

  const loadDashboard = useCallback(async () => {
    if (!session || !authorized) return;
    try {
      const [analyticsData, reportsData, broadcastData] = await Promise.all([
        adminRequest<Analytics>(session, '/api/v1/admin/analytics'),
        adminRequest<Reports>(session, '/api/v1/admin/reports'),
        adminRequest<{ broadcast: Broadcast }>(session, '/api/v1/admin/broadcast'),
      ]);
      setAnalytics(analyticsData);
      setReports(reportsData);
      setBroadcast(broadcastData.broadcast);
      setBroadcastDraft(broadcastData.broadcast?.message ?? '');
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The admin console could not be loaded.');
    } finally {
      setDashboardLoading(false);
    }
  }, [authorized, session]);

  useEffect(() => {
    if (!authorized) return;
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authorized, loadDashboard]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Authentication is not configured for this deployment.');
      return;
    }
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });
    if (signInError) setError(signInError.message);
    setPassword('');
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setSession(null);
      setAnalytics(null);
      setReports(null);
    }
  };

  const saveBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ broadcast: Broadcast }>(session, '/api/v1/admin/broadcast', 'POST', { message: broadcastDraft });
      setBroadcast(result.broadcast);
      setBroadcastDraft(result.broadcast?.message ?? '');
      setNotice('Announcement saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The announcement could not be saved.');
    }
  };

  const clearBroadcast = async () => {
    if (!session) return;
    setError('');
    setNotice('');
    try {
      await adminRequest(session, '/api/v1/admin/broadcast', 'DELETE');
      setBroadcast(null);
      setBroadcastDraft('');
      setNotice('Announcement removed.');
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'The announcement could not be removed.');
    }
  };

  const deleteReport = async (reportId: string, type: 'post' | 'marketplace') => {
    if (!session) return;
    setError('');
    try {
      await adminRequest(session, '/api/v1/admin/reports', 'DELETE', { reportId, type });
      await loadDashboard();
      setNotice('Report removed.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The report could not be removed.');
    }
  };

  if (loading) return <main className="admin-page"><div className="admin-loading">Loading secure console…</div></main>;

  if (!configured) {
    return <main className="admin-page"><section className="admin-auth-card"><ShieldCheck size={28} /><h1>Admin console</h1><p>Authentication is not configured for this deployment.</p></section></main>;
  }

  if (!session) {
    return (
      <main className="admin-page">
        <form className="admin-auth-card" onSubmit={(event) => void signIn(event)}>
          <span className="admin-mark"><ShieldCheck size={22} /></span>
          <span className="eyebrow">PRIVATE ADMIN AREA</span>
          <h1>Sign in to Admin</h1>
          <p>Only the authorized Commonroom administrator can enter this console.</p>
          <label>Email<input autoComplete="username" readOnly value={ADMIN_EMAIL} /></label>
          <label>Password<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error ? <div className="feedback error-banner" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit">Sign in securely</button>
          <Link href="/">Return to Commonroom</Link>
        </form>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="admin-page">
        <section className="admin-auth-card">
          <span className="admin-mark denied"><ShieldCheck size={22} /></span>
          <span className="eyebrow">ACCESS RESTRICTED</span>
          <h1>No admin access</h1>
          <p>This signed-in account is not authorized to use the admin console.</p>
          {error ? <div className="feedback error-banner" role="alert">{error}</div> : null}
          <button className="secondary-button" onClick={() => void signOut()} type="button"><LogOut size={15} /> Sign out</button>
          <Link href="/">Return to Commonroom</Link>
        </section>
      </main>
    );
  }

  const overview = analytics?.overview;
  const metrics = [
    ['Total users', overview?.totalUsers],
    ['New this week', overview?.newUsersWeek],
    ['Posts', overview?.totalPosts],
    ['Open reports', overview?.pendingReports],
    ['Active listings', overview?.activeListings],
    ['Connect profiles', overview?.totalDatingProfiles],
  ] as const;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin"><span className="admin-mark"><ShieldCheck size={19} /></span><span>Commonroom <b>Admin</b></span></a>
        <div><span>{ADMIN_EMAIL}</span><button className="secondary-button" onClick={() => void signOut()} type="button"><LogOut size={14} /> Sign out</button></div>
      </header>
      <div className="admin-content">
        <header className="admin-page-heading"><div><span className="eyebrow">PRIVATE ADMIN AREA</span><h1>Overview</h1><p>Manage community activity, moderation reports, and announcements.</p></div><button className="secondary-button" disabled={dashboardLoading} onClick={() => { setDashboardLoading(true); setError(''); void loadDashboard(); }} type="button">{dashboardLoading ? 'Refreshing…' : 'Refresh'}</button></header>
        {error ? <div className="feedback error-banner" role="alert">{error}</div> : null}
        {notice ? <div className="feedback success-banner" role="status">{notice}</div> : null}
        {dashboardLoading && !analytics ? <div className="admin-loading">Loading dashboard data…</div> : null}

        <section className="admin-metrics" aria-label="Community metrics">
          {metrics.map(([label, value]) => <article className="admin-panel admin-metric" key={label}><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString() : '—'}</strong></article>)}
        </section>

        <div className="admin-columns">
          <section className="admin-panel admin-section">
            <header><div><Users size={17} /><h2>Recent members</h2></div><span>Latest 50</span></header>
            {analytics?.recentUsers.length ? <div className="admin-table-wrap"><table><thead><tr><th>Member</th><th>School</th><th>Joined</th></tr></thead><tbody>
              {analytics.recentUsers.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.username ? `@${user.username}` : 'No username'}</small></td><td>{user.school ?? '—'}</td><td>{new Date(user.joinedAt).toLocaleDateString()}</td></tr>)}
            </tbody></table></div> : <p className="admin-muted">No member data available.</p>}
          </section>

          <section className="admin-panel admin-section">
            <header><div><Megaphone size={17} /><h2>Community announcement</h2></div></header>
            <form className="admin-broadcast-form" onSubmit={(event) => void saveBroadcast(event)}>
              <label>Message<textarea maxLength={500} onChange={(event) => setBroadcastDraft(event.target.value)} placeholder="Write an announcement for the community…" rows={4} value={broadcastDraft} /></label>
              <div><small>{broadcastDraft.length}/500 {broadcast ? `· Updated ${new Date(broadcast.createdAt).toLocaleString()}` : '· No announcement is currently active'}</small><button className="primary-button" disabled={!broadcastDraft.trim()} type="submit">Publish announcement</button></div>
            </form>
            {broadcast ? <button className="admin-danger-link" onClick={() => void clearBroadcast()} type="button"><Trash2 size={14} /> Remove announcement</button> : null}
          </section>
        </div>

        <section className="admin-panel admin-section admin-reports">
          <header><div><BarChart3 size={17} /><h2>Moderation reports</h2></div><span>{(reports?.postReports.length ?? 0) + (reports?.marketplaceReports.length ?? 0)} reports</span></header>
          {reports ? (
            <div className="admin-report-grid">
              {[...reports.postReports.map((item) => ({ ...item, type: 'post' as const, subject: item.post?.caption || 'Post no longer available', author: item.post?.authorName ?? 'Unknown author' })),
                ...reports.marketplaceReports.map((item) => ({ ...item, type: 'marketplace' as const, subject: item.listing?.title || 'Listing no longer available', author: item.listing?.sellerName ?? 'Unknown seller' }))]
                .map((item) => <article className="admin-report" key={`${item.type}-${item.id}`}>
                  <div><span className="admin-report-type">{item.type === 'post' ? 'Post' : 'Marketplace'}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>
                  <h3>{item.subject}</h3><p>{item.type === 'post' ? `By ${item.author}` : `Seller: ${item.author}`}</p>
                  <blockquote>{item.reason}{item.details ? ` — ${item.details}` : ''}</blockquote>
                  <button className="admin-danger-link" onClick={() => void deleteReport(item.id, item.type)} type="button"><Trash2 size={14} /> Remove report</button>
                </article>)}
              {!reports.postReports.length && !reports.marketplaceReports.length ? <p className="admin-muted">No moderation reports.</p> : null}
            </div>
          ) : null}
        </section>
        <footer className="admin-footer"><ShieldCheck size={14} /> Each admin API independently verifies the authorized, confirmed email.</footer>
      </div>
    </main>
  );
}
