'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { adminCall, naira } from './adminApi';
import { BarChart, BarList, LineChart } from './Charts';
import './admin-extra.css';

type Stats = {
  range: string;
  users: { allTimeVisitors: number; guests: number; membersSeen: number; registered: number; activeToday: number; activeThisWeek: number; activeThisMonth: number; activeInRange: number };
  daily: Array<{ day: string; active: number; newVisitors: number; newMembers: number }>;
  revenue: { totalNaira: number; inRangeNaira: number; todayNaira: number; weekNaira: number; monthNaira: number; payments: number; daily: Array<{ day: string; naira: number }>; byProduct: Array<{ product: string; naira: number; count: number }> };
  demographics: Record<'countries' | 'cities' | 'devices' | 'systems' | 'browsers' | 'sources', Array<{ label: string; people: number }>>;
};

const RANGES = [['today', 'Today'], ['week', '7 days'], ['month', '30 days'], ['all', 'All time']] as const;
const PRODUCT_LABEL: Record<string, string> = { pro_month: 'Pro (30 days)', ultimate_pass: 'Ultimate Pass', ad_campaign: 'Ads' };

/** Admin "Analytics" tab: how many people, how many are active, what they pay, and who they are. Sort by period with the buttons. */
export function AnalyticsPanel({ session }: { session: Session }) {
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('week');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await adminCall<Stats>(session, `/api/v1/admin/stats?range=${range}`);
        if (active) { setStats(result); setError(''); }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the numbers.');
      }
    })();
    return () => { active = false; };
  }, [range, session]);

  const periodLabel = RANGES.find(([key]) => key === range)?.[1] ?? '';
  const days = stats?.daily.map((row) => row.day) ?? [];

  return (
    <section className="admin-panel admin-section">
      <header>
        <div><h2>Analytics</h2></div>
        <div aria-label="Period" className="adm-seg" role="tablist">
          {RANGES.map(([key, label]) => <button aria-selected={range === key} key={key} onClick={() => setRange(key)} role="tab" type="button">{label}</button>)}
        </div>
      </header>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {!stats && !error ? <p className="admin-muted">Loading…</p> : null}
      {stats ? (
        <>
          <div className="adm-tiles">
            <div><span>All-time visitors</span><b>{stats.users.allTimeVisitors.toLocaleString()}</b><small>Everyone who ever opened the app, guests too</small></div>
            <div><span>Registered users</span><b>{stats.users.registered.toLocaleString()}</b><small>{stats.users.guests.toLocaleString()} guests have opened the app</small></div>
            <div><span>Active today</span><b>{stats.users.activeToday.toLocaleString()}</b><small>Opened the app in the last 24 hours</small></div>
            <div><span>Active this week</span><b>{stats.users.activeThisWeek.toLocaleString()}</b><small>Last 7 days</small></div>
            <div><span>Active this month</span><b>{stats.users.activeThisMonth.toLocaleString()}</b><small>Last 30 days</small></div>
            <div><span>Revenue ({periodLabel.toLowerCase()})</span><b>{naira(stats.revenue.inRangeNaira)}</b><small>{naira(stats.revenue.totalNaira)} all time · {stats.revenue.payments} payments</small></div>
          </div>

          <LineChart labels={days} series={[{ name: 'Active people', color: '#6c8cff', values: stats.daily.map((row) => row.active) }, { name: 'New visitors', color: '#ffb35c', values: stats.daily.map((row) => row.newVisitors) }]} title="People per day (30 days)" />
          <LineChart labels={days} series={[{ name: 'New members', color: '#4cd9a0', values: stats.daily.map((row) => row.newMembers) }]} title="New registered members per day" />
          <BarChart color="#4cd9a0" format={naira} labels={stats.revenue.daily.map((row) => row.day)} title="Revenue per day (30 days)" values={stats.revenue.daily.map((row) => row.naira)} />

          <div className="adm-tiles adm-tiles--small">
            <div><span>Revenue today</span><b>{naira(stats.revenue.todayNaira)}</b></div>
            <div><span>Revenue this week</span><b>{naira(stats.revenue.weekNaira)}</b></div>
            <div><span>Revenue this month</span><b>{naira(stats.revenue.monthNaira)}</b></div>
          </div>
          <BarList color="#4cd9a0" empty="No confirmed payments in this period." rows={stats.revenue.byProduct.map((row) => ({ label: `${PRODUCT_LABEL[row.product] ?? row.product} · ${naira(row.naira)}`, people: row.count }))} title={`Revenue by product (${periodLabel.toLowerCase()}, number of payments)`} />

          <h3 className="adm-h3">Who they are ({periodLabel.toLowerCase()})</h3>
          <p className="admin-muted">From the connection and the browser, never from a profile. Counts people (not visits). Only people who opened the app since this tracking began are included.</p>
          <div className="adm-grid2">
            <BarList color="#6c8cff" rows={stats.demographics.countries} title="Countries" />
            <BarList color="#6c8cff" rows={stats.demographics.cities} title="Cities" />
            <BarList color="#ffb35c" rows={stats.demographics.devices} title="Devices" />
            <BarList color="#ffb35c" rows={stats.demographics.systems} title="Operating systems" />
            <BarList color="#ffb35c" rows={stats.demographics.browsers} title="Browsers and apps" />
            <BarList color="#6c8cff" empty="No tagged links yet. Share links like /anonymous?s=tiktok." rows={stats.demographics.sources} title="Where they came from (?s= tag, all time)" />
          </div>
        </>
      ) : null}
    </section>
  );
}
