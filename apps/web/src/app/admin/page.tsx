'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Heart,
  Key,
  LogOut,
  Megaphone,
  MessageSquare,
  PenSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

const ADMIN_EMAIL = 'ibitoyrgideon79@gmail.com';

type Tab = 'overview' | 'users' | 'moderation' | 'announcements';

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

type UserItem = {
  id: string;
  displayName: string;
  username: string | null;
  email: string;
  password?: string;
  school: string | null;
  course: string;
  year: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: string;
  counts: {
    posts: number;
    listings: number;
    reportsMade: number;
  };
};

type UserDirectoryResponse = {
  users: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ReportItem = {
  id: string;
  reason: string;
  details?: string;
  createdAt: string;
  reporter?: {
    id: string;
    displayName: string;
    username: string | null;
  };
  post?: {
    id: string;
    caption: string;
    mediaType: string;
    authorName: string;
    authorUsername: string;
    createdAt: string;
  } | null;
  listing?: {
    id: string;
    title: string;
    sellerName: string;
    sellerUsername: string;
    price: number;
    status: string;
  } | null;
};

type Reports = {
  postReports: ReportItem[];
  marketplaceReports: ReportItem[];
};

type Broadcast = { message: string; createdAt: string } | null;

async function adminRequest<T>(
  session: Session,
  path: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  if (!result || !('data' in result)) {
    throw new Error('The admin service returned an invalid response.');
  }
  return result.data as T;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [password, setPassword] = useState('');

  // Dashboard Data
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [broadcast, setBroadcast] = useState<Broadcast>(null);
  const [broadcastDraft, setBroadcastDraft] = useState('');

  // User Management State
  const [usersLoading, setUsersLoading] = useState(false);
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSchoolFilter, setUserSchoolFilter] = useState('');

  // Moderation state
  const [moderationFilter, setModerationFilter] = useState<'all' | 'post' | 'marketplace'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Status feedback
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const configured = isSupabaseConfigured();
  const supabase = configured ? getBrowserSupabase() : null;

  useEffect(() => {
    if (!supabase) return;
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

  const authorized = Boolean(
    session?.user.email_confirmed_at &&
      session.user.email?.trim().toLowerCase() === ADMIN_EMAIL
  );

  const loadDashboard = useCallback(async () => {
    if (!session || !authorized) return;
    setDashboardLoading(true);
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
      setError(loadError instanceof Error ? loadError.message : 'The admin dashboard could not be loaded.');
    } finally {
      setDashboardLoading(false);
    }
  }, [authorized, session]);

  const loadUsers = useCallback(
    async (page = 1, query = userSearchQuery, school = userSchoolFilter) => {
      if (!session || !authorized) return;
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '15',
          ...(query ? { query } : {}),
          ...(school ? { school } : {}),
        });
        const data = await adminRequest<UserDirectoryResponse>(
          session,
          `/api/v1/admin/users?${params.toString()}`
        );
        setUserList(data.users);
        setUserPagination(data.pagination);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to retrieve user directory.');
      } finally {
        setUsersLoading(false);
      }
    },
    [authorized, session, userSearchQuery, userSchoolFilter]
  );

  useEffect(() => {
    if (!authorized) return;
    void loadDashboard();
  }, [authorized, loadDashboard]);

  useEffect(() => {
    if (!authorized || activeTab !== 'users') return;
    void loadUsers(1);
  }, [authorized, activeTab, loadUsers]);

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
      setUserList([]);
    }
  };

  const saveBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setError('');
    setNotice('');
    try {
      const result = await adminRequest<{ broadcast: Broadcast }>(
        session,
        '/api/v1/admin/broadcast',
        'POST',
        { message: broadcastDraft }
      );
      setBroadcast(result.broadcast);
      setBroadcastDraft(result.broadcast?.message ?? '');
      setNotice('Announcement published successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Announcement could not be saved.');
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
      setNotice('Announcement cleared.');
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Announcement could not be cleared.');
    }
  };

  const handleModerationAction = async (
    reportId: string,
    type: 'post' | 'marketplace',
    action: 'dismiss' | 'take_down'
  ) => {
    if (!session) return;
    setError('');
    setActionInProgress(reportId);
    try {
      await adminRequest(session, '/api/v1/admin/reports', 'DELETE', {
        reportId,
        type,
        action,
      });
      await loadDashboard();
      setNotice(
        action === 'take_down'
          ? `Content removed and report resolved.`
          : 'Report dismissed.'
      );
    } catch (actError) {
      setError(actError instanceof Error ? actError.message : 'Moderation action failed.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Impersonation & Power CRUD states
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [loginModalUser, setLoginModalUser] = useState<UserItem | null>(null);
  const [postModalUser, setPostModalUser] = useState<UserItem | null>(null);
  const [postCaptionDraft, setPostCaptionDraft] = useState('');
  const [commentModalUser, setCommentModalUser] = useState<UserItem | null>(null);
  const [commentPostIdDraft, setCommentPostIdDraft] = useState('');
  const [commentBodyDraft, setCommentBodyDraft] = useState('');
  const [matchModalUser, setMatchModalUser] = useState<UserItem | null>(null);
  const [matchTargetUserIdDraft, setMatchTargetUserIdDraft] = useState('');
  const [crudBusy, setCrudBusy] = useState(false);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!session || !confirm(`Permanently delete account for "${name}"?`)) return;
    setCrudBusy(true);
    setError('');
    try {
      await adminRequest(session, '/api/v1/admin/crud', 'POST', { action: 'delete_user', userId });
      setNotice(`User ${name} deleted successfully.`);
      await loadUsers(userPagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user.');
    } finally {
      setCrudBusy(false);
    }
  };

  const handleBulkDeletePosts = async () => {
    if (!session || !confirm('⚠️ WARNING: Delete ALL posts in the system?')) return;
    setCrudBusy(true);
    setError('');
    try {
      const res = await adminRequest<{ deleted: number }>(session, '/api/v1/admin/crud', 'POST', {
        action: 'delete_posts_bulk',
        all: true,
      });
      setNotice(`Bulk deleted ${res.deleted} posts across the system.`);
      await loadDashboard();
      await loadUsers(userPagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete posts failed.');
    } finally {
      setCrudBusy(false);
    }
  };

  const handleBulkDeleteSeeded = async () => {
    if (!session || !confirm('⚠️ WARNING: Delete all seeded accounts from the database?')) return;
    setCrudBusy(true);
    setError('');
    try {
      const res = await adminRequest<{ deleted: number }>(session, '/api/v1/admin/crud', 'POST', {
        action: 'bulk_delete_users',
        filter: 'seeded',
      });
      setNotice(`Deleted ${res.deleted} seeded accounts.`);
      await loadDashboard();
      await loadUsers(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete users failed.');
    } finally {
      setCrudBusy(false);
    }
  };

  const handleCreatePostAsUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !postModalUser || !postCaptionDraft.trim()) return;
    setCrudBusy(true);
    setError('');
    try {
      await adminRequest(session, '/api/v1/admin/crud', 'POST', {
        action: 'create_post_as_user',
        asUserId: postModalUser.id,
        caption: postCaptionDraft.trim(),
      });
      setNotice(`Post successfully published as ${postModalUser.displayName}!`);
      setPostModalUser(null);
      setPostCaptionDraft('');
      await loadUsers(userPagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post as user.');
    } finally {
      setCrudBusy(false);
    }
  };

  const handleCreateCommentAsUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !commentModalUser || !commentPostIdDraft.trim() || !commentBodyDraft.trim()) return;
    setCrudBusy(true);
    setError('');
    try {
      await adminRequest(session, '/api/v1/admin/crud', 'POST', {
        action: 'create_comment_as_user',
        asUserId: commentModalUser.id,
        postId: commentPostIdDraft.trim(),
        body: commentBodyDraft.trim(),
      });
      setNotice(`Comment posted as ${commentModalUser.displayName}!`);
      setCommentModalUser(null);
      setCommentPostIdDraft('');
      setCommentBodyDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to comment as user.');
    } finally {
      setCrudBusy(false);
    }
  };

  const handleMatchAsUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !matchModalUser || !matchTargetUserIdDraft.trim()) return;
    setCrudBusy(true);
    setError('');
    try {
      await adminRequest(session, '/api/v1/admin/crud', 'POST', {
        action: 'match_as_user',
        fromUserId: matchModalUser.id,
        toUserId: matchTargetUserIdDraft.trim(),
      });
      setNotice(`Instant mutual match created between ${matchModalUser.displayName} and target profile!`);
      setMatchModalUser(null);
      setMatchTargetUserIdDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to match users.');
    } finally {
      setCrudBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">Loading secure console…</div>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="admin-page">
        <section className="admin-auth-card">
          <ShieldCheck size={28} />
          <h1>Admin console</h1>
          <p>Authentication is not configured for this deployment.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-page">
        <form className="admin-auth-card" onSubmit={(event) => void signIn(event)}>
          <span className="admin-mark">
            <ShieldCheck size={22} />
          </span>
          <span className="eyebrow">PRIVATE ADMIN AREA</span>
          <h1>Sign in to Admin</h1>
          <p>Only the authorized Commonroom administrator can enter this console.</p>
          <label>
            Email
            <input autoComplete="username" readOnly value={ADMIN_EMAIL} />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <div className="feedback error-banner" role="alert">
              {error}
            </div>
          ) : null}
          <button className="primary-button" type="submit">
            Sign in securely
          </button>
          <Link href="/">Return to Commonroom</Link>
        </form>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="admin-page">
        <section className="admin-auth-card">
          <span className="admin-mark denied">
            <ShieldCheck size={22} />
          </span>
          <span className="eyebrow">ACCESS RESTRICTED</span>
          <h1>No admin access</h1>
          <p>This signed-in account is not authorized to use the admin console.</p>
          {error ? (
            <div className="feedback error-banner" role="alert">
              {error}
            </div>
          ) : null}
          <button className="secondary-button" onClick={() => void signOut()} type="button">
            <LogOut size={15} /> Sign out
          </button>
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

  const totalReportsCount = (reports?.postReports.length ?? 0) + (reports?.marketplaceReports.length ?? 0);

  const filteredReports = [
    ...(reports?.postReports.map((item) => ({
      ...item,
      type: 'post' as const,
      subject: item.post?.caption || 'Post has been removed or deleted',
      author: item.post?.authorName ?? 'Unknown author',
      authorUsername: item.post?.authorUsername,
    })) ?? []),
    ...(reports?.marketplaceReports.map((item) => ({
      ...item,
      type: 'marketplace' as const,
      subject: item.listing?.title || 'Listing has been removed or deleted',
      author: item.listing?.sellerName ?? 'Unknown seller',
      authorUsername: item.listing?.sellerUsername,
      price: item.listing?.price,
    })) ?? []),
  ].filter((item) => (moderationFilter === 'all' ? true : item.type === moderationFilter));

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin">
          <span className="admin-mark">
            <ShieldCheck size={19} />
          </span>
          <span>
            Commonroom <b>Admin</b>
          </span>
        </a>
        <div>
          <span>{ADMIN_EMAIL}</span>
          <button className="secondary-button" onClick={() => void signOut()} type="button">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="admin-content">
        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">ADMINISTRATION & MODERATION</span>
            <h1>Campus Operations</h1>
            <p>User management, real-time moderation, community safety, and platform broadcasts.</p>
          </div>
          <button
            className="secondary-button"
            disabled={dashboardLoading}
            onClick={() => {
              void loadDashboard();
              if (activeTab === 'users') void loadUsers(userPagination.page);
            }}
            type="button"
          >
            <RefreshCw className={dashboardLoading ? 'spin' : ''} size={14} />
            {dashboardLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error ? (
          <div className="feedback error-banner" role="alert">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="feedback success-banner" role="status">
            {notice}
          </div>
        ) : null}

        {/* Navigation Tabs */}
        <nav className="admin-nav-tabs" aria-label="Admin Navigation Tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            type="button"
          >
            <BarChart3 size={15} /> Overview
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            type="button"
          >
            <Users size={15} /> User Management
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
            type="button"
          >
            <ShieldAlert size={15} /> Moderation Queue
            {totalReportsCount > 0 ? (
              <span className="admin-tab-count">{totalReportsCount}</span>
            ) : null}
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
            type="button"
          >
            <Megaphone size={15} /> Announcements
          </button>
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <section className="admin-metrics" aria-label="Community metrics">
              {metrics.map(([label, value]) => (
                <article className="admin-panel admin-metric" key={label}>
                  <span>{label}</span>
                  <strong>{typeof value === 'number' ? value.toLocaleString() : '—'}</strong>
                </article>
              ))}
            </section>

            <div className="admin-columns">
              <section className="admin-panel admin-section">
                <header>
                  <div>
                    <Users size={17} />
                    <h2>Recent Members</h2>
                  </div>
                  <span>Latest 50</span>
                </header>
                {analytics?.recentUsers.length ? (
                  <div className="admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>School</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <strong>{user.displayName}</strong>
                              <small>{user.username ? `@${user.username}` : 'No username'}</small>
                            </td>
                            <td>{user.school ?? '—'}</td>
                            <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-muted">No member data available.</p>
                )}
              </section>

              <section className="admin-panel admin-section">
                <header>
                  <div>
                    <Megaphone size={17} />
                    <h2>Active Announcement</h2>
                  </div>
                </header>
                {broadcast ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div className="admin-report-target-box">
                      <p style={{ margin: 0, color: '#e7edf7', fontSize: '12px' }}>
                        &ldquo;{broadcast.message}&rdquo;
                      </p>
                      <small style={{ color: '#8192ac', marginTop: '6px', display: 'block' }}>
                        Published {new Date(broadcast.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <button
                      className="admin-danger-link"
                      onClick={() => void clearBroadcast()}
                      type="button"
                    >
                      <Trash2 size={14} /> Remove announcement
                    </button>
                  </div>
                ) : (
                  <p className="admin-muted">No active community announcement.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT & POWER CRUD */}
        {activeTab === 'users' && (
          <section className="admin-panel admin-section">
            <header>
              <div>
                <UserCheck size={17} />
                <h2>Campus Directory & Account Power Console ({userPagination.total.toLocaleString()} members)</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="admin-btn-action admin-btn-danger"
                  disabled={crudBusy}
                  onClick={() => void handleBulkDeletePosts()}
                  title="Delete all posts across the system"
                  type="button"
                >
                  <Trash2 size={12} /> Bulk Delete All Posts
                </button>
                <button
                  className="admin-btn-action admin-btn-danger"
                  disabled={crudBusy}
                  onClick={() => void handleBulkDeleteSeeded()}
                  title="Remove all seeded accounts"
                  type="button"
                >
                  <Trash2 size={12} /> Clear Seeded Accounts
                </button>
                <button
                  className="admin-btn-action"
                  disabled={usersLoading}
                  onClick={() => void loadUsers(userPagination.page)}
                  type="button"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </header>

            {/* Filter and Search Bar */}
            <div className="admin-filter-bar">
              <input
                className="admin-search-input"
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadUsers(1, userSearchQuery, userSchoolFilter);
                }}
                placeholder="Search by name, email, @username, or school…"
                type="search"
                value={userSearchQuery}
              />
              <button
                className="admin-btn-action"
                onClick={() => void loadUsers(1, userSearchQuery, userSchoolFilter)}
                type="button"
              >
                <Search size={13} /> Search
              </button>
              {(userSearchQuery || userSchoolFilter) && (
                <button
                  className="admin-btn-action"
                  onClick={() => {
                    setUserSearchQuery('');
                    setUserSchoolFilter('');
                    void loadUsers(1, '', '');
                  }}
                  type="button"
                >
                  Reset
                </button>
              )}
            </div>

            {usersLoading ? (
              <div className="admin-loading">Loading users & credentials…</div>
            ) : userList.length ? (
              <div className="admin-table-wrap" style={{ maxHeight: '520px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Institution / Role</th>
                      <th>Activity</th>
                      <th>Impersonate & CRUD Powers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((user) => (
                      <tr key={user.id}>
                        {/* 1. Name & Username */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.avatarUrl ? (
                              <img
                                alt={user.displayName}
                                src={user.avatarUrl}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: '#1d2a3d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {user.displayName.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <strong>{user.displayName}</strong>
                              <small>{user.username ? `@${user.username}` : 'No handle'}</small>
                            </div>
                          </div>
                        </td>

                        {/* 2. Email Address */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a9c4ff' }}>
                              {user.email || '—'}
                            </span>
                            {user.email && (
                              <button
                                className="admin-btn-action"
                                onClick={() => void copyToClipboard(user.email!, `email-${user.id}`)}
                                style={{ padding: '2px 5px' }}
                                title="Copy email"
                                type="button"
                              >
                                {copiedId === `email-${user.id}` ? (
                                  <CheckCircle color="#4ade80" size={10} />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Password (Upfront with Show/Hide & Copy!) */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <code
                              style={{
                                background: '#0b1018',
                                border: '1px solid #233147',
                                padding: '3px 7px',
                                borderRadius: '5px',
                                fontSize: '11px',
                                color: '#38bdf8',
                                fontFamily: 'monospace',
                              }}
                            >
                              {showPasswordMap[user.id] ? (user.password || '—') : '••••••••'}
                            </code>
                            <button
                              className="admin-btn-action"
                              onClick={() =>
                                setShowPasswordMap((prev) => ({ ...prev, [user.id]: !prev[user.id] }))
                              }
                              style={{ padding: '2px 5px' }}
                              title={showPasswordMap[user.id] ? 'Hide password' : 'Show password'}
                              type="button"
                            >
                              {showPasswordMap[user.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                            </button>
                            {user.password && (
                              <button
                                className="admin-btn-action"
                                onClick={() => void copyToClipboard(user.password!, `pwd-${user.id}`)}
                                style={{ padding: '2px 5px' }}
                                title="Copy password"
                                type="button"
                              >
                                {copiedId === `pwd-${user.id}` ? (
                                  <CheckCircle color="#4ade80" size={10} />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Institution */}
                        <td>
                          <span>{user.school || 'General / Non-School'}</span>
                          {user.course ? (
                            <small>
                              {user.course} {user.year ? `· ${user.year}` : ''}
                            </small>
                          ) : null}
                        </td>

                        {/* 5. Activity */}
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <span className="admin-badge">
                              Posts: <b className="admin-badge-count">{user.counts.posts}</b>
                            </span>
                            <span className="admin-badge">
                              Listings: <b className="admin-badge-count">{user.counts.listings}</b>
                            </span>
                          </div>
                        </td>

                        {/* 6. Admin Powers & Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button
                              className="admin-btn-action"
                              onClick={() => setLoginModalUser(user)}
                              style={{ color: '#a9c4ff' }}
                              title="Login as this user"
                              type="button"
                            >
                              <Key size={11} /> Login As
                            </button>
                            <button
                              className="admin-btn-action"
                              onClick={() => setPostModalUser(user)}
                              title="Create a post in Room as this user"
                              type="button"
                            >
                              <PenSquare size={11} /> Post As
                            </button>
                            <button
                              className="admin-btn-action"
                              onClick={() => setCommentModalUser(user)}
                              title="Add comment as this user"
                              type="button"
                            >
                              <MessageSquare size={11} /> Comment
                            </button>
                            <button
                              className="admin-btn-action"
                              onClick={() => setMatchModalUser(user)}
                              title="Match this user with another profile"
                              type="button"
                            >
                              <Heart size={11} /> Match
                            </button>
                            <button
                              className="admin-btn-action admin-btn-danger"
                              onClick={() => void handleDeleteUser(user.id, user.displayName)}
                              title="Delete user"
                              type="button"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-muted">No users matched your query.</p>
            )}

            {/* Pagination Controls */}
            {userPagination.totalPages > 1 && (
              <div className="admin-pagination">
                <span>
                  Showing page {userPagination.page} of {userPagination.totalPages} (
                  {userPagination.total.toLocaleString()} total members)
                </span>
                <div className="admin-pagination-btns">
                  <button
                    className="admin-btn-action"
                    disabled={userPagination.page <= 1 || usersLoading}
                    onClick={() => void loadUsers(userPagination.page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="admin-btn-action"
                    disabled={userPagination.page >= userPagination.totalPages || usersLoading}
                    onClick={() => void loadUsers(userPagination.page + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MODERATION QUEUE */}
        {activeTab === 'moderation' && (
          <section className="admin-panel admin-section">
            <header>
              <div>
                <ShieldAlert size={17} />
                <h2>Moderation Queue ({filteredReports.length} pending)</h2>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`admin-btn-action ${moderationFilter === 'all' ? 'admin-badge-count' : ''}`}
                  onClick={() => setModerationFilter('all')}
                  type="button"
                >
                  All ({totalReportsCount})
                </button>
                <button
                  className={`admin-btn-action ${moderationFilter === 'post' ? 'admin-badge-count' : ''}`}
                  onClick={() => setModerationFilter('post')}
                  type="button"
                >
                  Posts ({reports?.postReports.length ?? 0})
                </button>
                <button
                  className={`admin-btn-action ${moderationFilter === 'marketplace' ? 'admin-badge-count' : ''}`}
                  onClick={() => setModerationFilter('marketplace')}
                  type="button"
                >
                  Marketplace ({reports?.marketplaceReports.length ?? 0})
                </button>
              </div>
            </header>

            {filteredReports.length ? (
              <div className="admin-report-grid">
                {filteredReports.map((item) => (
                  <article className="admin-report-card" key={`${item.type}-${item.id}`}>
                    <div className="admin-report-card-top">
                      <span className="admin-report-type">
                        {item.type === 'post' ? 'Post Report' : 'Listing Report'}
                      </span>
                      <time style={{ fontSize: '10px', color: '#8192ac' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </div>

                    <div>
                      <strong style={{ fontSize: '12px', color: '#ffb6bd' }}>
                        Reason: {item.reason}
                      </strong>
                      {item.details ? (
                        <p style={{ margin: '4px 0 0', color: '#b9c5d7', fontSize: '11px' }}>
                          Details: {item.details}
                        </p>
                      ) : null}
                    </div>

                    <div className="admin-report-target-box">
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#8192ac',
                          marginBottom: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Target: {item.type === 'post' ? 'Feed Post' : 'Marketplace Item'}</span>
                        <span>Author: {item.author} {item.authorUsername ? `(@${item.authorUsername})` : ''}</span>
                      </div>
                      <p style={{ margin: 0, color: '#e7edf7', fontSize: '12px' }}>
                        {item.subject}
                      </p>
                      {'price' in item && typeof item.price === 'number' ? (
                        <small style={{ color: '#7be8b0', display: 'block', marginTop: '4px' }}>
                          Price: ₦{item.price.toLocaleString()}
                        </small>
                      ) : null}
                    </div>

                    <div className="admin-report-actions">
                      <button
                        className="admin-btn-action admin-btn-danger"
                        disabled={actionInProgress === item.id}
                        onClick={() => void handleModerationAction(item.id, item.type, 'take_down')}
                        type="button"
                      >
                        <Trash2 size={13} />
                        {actionInProgress === item.id ? 'Removing…' : 'Take Down Content'}
                      </button>
                      <button
                        className="admin-btn-action"
                        disabled={actionInProgress === item.id}
                        onClick={() => void handleModerationAction(item.id, item.type, 'dismiss')}
                        type="button"
                      >
                        <CheckCircle size={13} />
                        Dismiss Report
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-muted">The moderation queue is empty. No open reports.</p>
            )}
          </section>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <section className="admin-panel admin-section">
            <header>
              <div>
                <Megaphone size={17} />
                <h2>Campus Broadcast Publisher</h2>
              </div>
            </header>

            <form className="admin-broadcast-form" onSubmit={(event) => void saveBroadcast(event)}>
              <label>
                Broadcast Message
                <textarea
                  maxLength={500}
                  onChange={(event) => setBroadcastDraft(event.target.value)}
                  placeholder="Announce campus notices, events, updates, or maintenance schedules…"
                  rows={5}
                  value={broadcastDraft}
                />
              </label>
              <div>
                <small>
                  {broadcastDraft.length}/500{' '}
                  {broadcast
                    ? `· Live broadcast active since ${new Date(broadcast.createdAt).toLocaleString()}`
                    : '· No announcement is currently active'}
                </small>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {broadcast ? (
                    <button
                      className="admin-btn-action admin-btn-danger"
                      onClick={() => void clearBroadcast()}
                      type="button"
                    >
                      <Trash2 size={13} /> Clear Live Broadcast
                    </button>
                  ) : null}
                  <button
                    className="primary-button"
                    disabled={!broadcastDraft.trim()}
                    type="submit"
                  >
                    Publish Announcement
                  </button>
                </div>
              </div>
            </form>

            {broadcastDraft.trim() ? (
              <div style={{ marginTop: '20px' }}>
                <span className="eyebrow">PREVIEW OF IN-APP BANNER</span>
                <div
                  style={{
                    marginTop: '8px',
                    background: '#1a273b',
                    border: '1px solid #334d75',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <Megaphone size={18} style={{ color: '#a9c4ff', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#f0f5fc' }}>{broadcastDraft}</span>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* =====================================================================
            CRUD MODAL 1: LOGIN AS USER
            ===================================================================== */}
        {loginModalUser ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 10000,
            }}
            onClick={() => setLoginModalUser(null)}
          >
            <div
              className="admin-panel"
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '24px',
                display: 'grid',
                gap: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a9c4ff' }}>
                  <Key size={18} />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#f3f6fb' }}>
                    Login Credentials for {loginModalUser.displayName}
                  </h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setLoginModalUser(null)}
                  style={{ background: 'none', border: 0, color: '#8899b2', cursor: 'pointer' }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#93a4bd' }}>
                You can use these credentials to sign into Commonroom normally as this user, test experiences, or perform manual interactions.
              </p>

              <div style={{ background: '#0b1018', border: '1px solid #233147', borderRadius: '10px', padding: '14px', display: 'grid', gap: '10px' }}>
                <div>
                  <small style={{ color: '#8293ad', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email Address
                  </small>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <code style={{ fontSize: '13px', color: '#eaf0fa' }}>{loginModalUser.email}</code>
                    <button
                      className="admin-btn-action"
                      onClick={() => void copyToClipboard(loginModalUser.email, 'modal-email')}
                      type="button"
                    >
                      {copiedId === 'modal-email' ? <CheckCircle color="#4ade80" size={12} /> : <Copy size={12} />} Copy
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1a2536', paddingTop: '8px' }}>
                  <small style={{ color: '#8293ad', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Plaintext Password
                  </small>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <code style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>
                      {loginModalUser.password || '(not available)'}
                    </code>
                    {loginModalUser.password ? (
                      <button
                        className="admin-btn-action"
                        onClick={() => void copyToClipboard(loginModalUser.password!, 'modal-pwd')}
                        type="button"
                      >
                        {copiedId === 'modal-pwd' ? <CheckCircle color="#4ade80" size={12} /> : <Copy size={12} />} Copy
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  className="admin-btn-action"
                  onClick={() => {
                    const text = `Email: ${loginModalUser.email}\nPassword: ${loginModalUser.password || ''}`;
                    void copyToClipboard(text, 'all-creds');
                  }}
                  type="button"
                >
                  <Copy size={12} /> {copiedId === 'all-creds' ? 'Copied Both!' : 'Copy Both'}
                </button>
                <a
                  className="primary-button"
                  href="/"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  target="_blank"
                >
                  <ExternalLink size={13} /> Open App Sign-In
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* =====================================================================
            CRUD MODAL 2: POST AS USER
            ===================================================================== */}
        {postModalUser ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 10000,
            }}
            onClick={() => setPostModalUser(null)}
          >
            <form
              className="admin-panel"
              onSubmit={(e) => void handleCreatePostAsUser(e)}
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a9c4ff' }}>
                  <PenSquare size={18} />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#f3f6fb' }}>
                    Publish Post as {postModalUser.displayName}
                  </h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setPostModalUser(null)}
                  style={{ background: 'none', border: 0, color: '#8899b2', cursor: 'pointer' }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: '#cbd5e4' }}>
                Caption
                <textarea
                  maxLength={1000}
                  onChange={(e) => setPostCaptionDraft(e.target.value)}
                  placeholder="What's happening on campus today?"
                  required
                  rows={4}
                  style={{
                    background: '#0d141e',
                    border: '1px solid #2a364c',
                    borderRadius: '8px',
                    color: '#eaf0fa',
                    padding: '10px',
                    font: 'inherit',
                  }}
                  value={postCaptionDraft}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn-action"
                  onClick={() => setPostModalUser(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={crudBusy || !postCaptionDraft.trim()}
                  type="submit"
                >
                  {crudBusy ? 'Publishing…' : 'Publish as Member'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* =====================================================================
            CRUD MODAL 3: COMMENT AS USER
            ===================================================================== */}
        {commentModalUser ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 10000,
            }}
            onClick={() => setCommentModalUser(null)}
          >
            <form
              className="admin-panel"
              onSubmit={(e) => void handleCreateCommentAsUser(e)}
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a9c4ff' }}>
                  <MessageSquare size={18} />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#f3f6fb' }}>
                    Post Comment as {commentModalUser.displayName}
                  </h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setCommentModalUser(null)}
                  style={{ background: 'none', border: 0, color: '#8899b2', cursor: 'pointer' }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: '#cbd5e4' }}>
                Target Post ID
                <input
                  onChange={(e) => setCommentPostIdDraft(e.target.value)}
                  placeholder="Paste Room Post UUID…"
                  required
                  style={{
                    background: '#0d141e',
                    border: '1px solid #2a364c',
                    borderRadius: '8px',
                    color: '#eaf0fa',
                    padding: '8px 10px',
                    fontSize: '12px',
                  }}
                  value={commentPostIdDraft}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: '#cbd5e4' }}>
                Comment Body
                <textarea
                  maxLength={500}
                  onChange={(e) => setCommentBodyDraft(e.target.value)}
                  placeholder="Great post! 👏"
                  required
                  rows={3}
                  style={{
                    background: '#0d141e',
                    border: '1px solid #2a364c',
                    borderRadius: '8px',
                    color: '#eaf0fa',
                    padding: '10px',
                    font: 'inherit',
                  }}
                  value={commentBodyDraft}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn-action"
                  onClick={() => setCommentModalUser(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={crudBusy || !commentPostIdDraft.trim() || !commentBodyDraft.trim()}
                  type="submit"
                >
                  {crudBusy ? 'Posting…' : 'Submit Comment'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* =====================================================================
            CRUD MODAL 4: MATCH AS USER
            ===================================================================== */}
        {matchModalUser ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 10000,
            }}
            onClick={() => setMatchModalUser(null)}
          >
            <form
              className="admin-panel"
              onSubmit={(e) => void handleMatchAsUser(e)}
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e' }}>
                  <Heart size={18} />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#f3f6fb' }}>
                    Connect/Match {matchModalUser.displayName}
                  </h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setMatchModalUser(null)}
                  style={{ background: 'none', border: 0, color: '#8899b2', cursor: 'pointer' }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#93a4bd' }}>
                Creates a two-way mutual connection in Connect between {matchModalUser.displayName} and the target user, enabling instant direct messaging.
              </p>

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: '#cbd5e4' }}>
                Target User ID
                <input
                  onChange={(e) => setMatchTargetUserIdDraft(e.target.value)}
                  placeholder="Paste other member's User UUID…"
                  required
                  style={{
                    background: '#0d141e',
                    border: '1px solid #2a364c',
                    borderRadius: '8px',
                    color: '#eaf0fa',
                    padding: '8px 10px',
                    fontSize: '12px',
                  }}
                  value={matchTargetUserIdDraft}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn-action"
                  onClick={() => setMatchModalUser(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={crudBusy || !matchTargetUserIdDraft.trim()}
                  type="submit"
                >
                  {crudBusy ? 'Matching…' : 'Create Mutual Match'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <footer className="admin-footer">
          <ShieldCheck size={14} /> Each admin API independently verifies the authorized, confirmed
          email and role-based permissions.
        </footer>
      </div>
    </main>
  );
}
