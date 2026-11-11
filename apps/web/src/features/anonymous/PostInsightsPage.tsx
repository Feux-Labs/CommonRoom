'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { apiRequest, errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import './insights.css';

type Detail = {
  createdAt: string;
  preview: string;
  totals: { views: number; viewers: number; likes: number; comments: number; shares: number };
  hourly: Array<{ t: string; views: number }>;
  daily: Array<{ day: string; views: number; likes: number; comments: number }>;
  sources: Array<{ source: string; views: number }>;
  audience: { guests: number; members: number };
  peakHour: number | null;
};

const n = (value: number) => value.toLocaleString();
const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%');
const hourLabel = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
const sourceLabel = (source: string) => (source === 'direct' ? 'Direct (no tag)' : source.charAt(0).toUpperCase() + source.slice(1));

type Range = 'day' | 'two-weeks';

/** Facebook-style Insights for one of your posts: headline numbers, views over time, who engaged and where views came from. */
export function PostInsightsPage({ kind, postId }: { kind: 'anonymous' | 'room'; postId: string }) {
  const router = useRouter();
  const { session, ready } = useAppSession();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<Range>('two-weeks');
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ready || !session) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await apiRequest<Detail>(`/api/v1/insights/detail?kind=${kind}&id=${postId}`, { session });
        if (active) { setDetail(result); setError(''); }
      } catch (loadError) {
        if (active) setError(errorMessage(loadError, 'Could not load the numbers.'));
      }
    })();
    return () => { active = false; };
  }, [attempt, kind, postId, ready, session]);

  const series = useMemo(() => {
    if (!detail) return [];
    return range === 'day'
      ? detail.hourly.map((point) => ({ label: hourLabel(new Date(point.t).getHours()), full: new Date(point.t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric' }), value: point.views }))
      : detail.daily.map((point) => ({ label: new Date(`${point.day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), full: new Date(`${point.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), value: point.views }));
  }, [detail, range]);

  const totals = detail?.totals;
  const engagement = totals ? totals.likes + totals.comments + totals.shares : 0;
  const rate = totals && totals.views > 0 ? `${((engagement / totals.views) * 100).toFixed(1)}%` : '—';
  const max = Math.max(1, ...series.map((point) => point.value));
  const seriesTotal = series.reduce((sum, point) => sum + point.value, 0);
  const shown = hover !== null ? series[hover] : null;

  return (
    <main className="cr-screen cr-screen--nonav cr-ins">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Post insights</h1><p className="cr-hd__sub">Only you can see these numbers.</p></div>
      </header>

      {error ? <ErrorBlock description={error} onRetry={() => { setError(''); setAttempt((value) => value + 1); }} title="Couldn’t load insights" /> : null}
      {!detail && !error ? <p aria-busy="true" className="cr-empty-line" role="status">Loading…</p> : null}

      {detail && totals ? (
        <>
          <section aria-label="Your post" className="cr-ins__post">
            <p>{detail.preview || 'Photo post'}</p>
            <small>Posted {new Date(detail.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</small>
          </section>

          <section aria-label="Summary" className="cr-ins__tiles">
            <div className="cr-ins__tile"><span>Views</span><b>{n(totals.views)}</b><small>Every time it was opened</small></div>
            <div className="cr-ins__tile"><span>Reach</span><b>{n(totals.viewers)}</b><small>Different people</small></div>
            <div className="cr-ins__tile"><span>Engagement</span><b>{rate}</b><small>{n(engagement)} likes, comments and shares</small></div>
            <div className="cr-ins__tile"><span>Shares</span><b>{n(totals.shares)}</b><small>Times it was shared</small></div>
          </section>

          {totals.views === 0 ? <p className="cr-ins__empty">No views yet. Views appear when people open your post. Share it to get them going.</p> : null}

          <section aria-labelledby="ins-views" className="cr-ins__card">
            <div className="cr-ins__row">
              <h2 id="ins-views">Views over time</h2>
              <div aria-label="Time range" className="cr-ins__seg" role="tablist">
                <button aria-selected={range === 'day'} onClick={() => { setRange('day'); setHover(null); }} role="tab" type="button">24 hours</button>
                <button aria-selected={range === 'two-weeks'} onClick={() => { setRange('two-weeks'); setHover(null); }} role="tab" type="button">14 days</button>
              </div>
            </div>
            <p aria-live="polite" className="cr-ins__readout">{shown ? <><b>{n(shown.value)}</b> {shown.value === 1 ? 'view' : 'views'} · {shown.full}</> : <><b>{n(seriesTotal)}</b> views in this period</>}</p>
            {table ? (
              <table className="cr-ins__table">
                <thead><tr><th>When</th><th>Views</th></tr></thead>
                <tbody>{series.map((point) => <tr key={point.full}><td>{point.full}</td><td>{n(point.value)}</td></tr>)}</tbody>
              </table>
            ) : (
              <svg aria-label={`Bar chart of views, ${seriesTotal} in total`} className="cr-ins__chart" role="img" viewBox="0 0 320 150">
                {[0, 0.5, 1].map((tick) => (
                  <g key={tick}>
                    <line className="cr-ins__grid" x1="26" x2="316" y1={120 - tick * 100} y2={120 - tick * 100} />
                    <text className="cr-ins__axis" textAnchor="end" x="22" y={124 - tick * 100}>{Math.round(max * tick)}</text>
                  </g>
                ))}
                {series.map((point, index) => {
                  const slot = 290 / series.length;
                  const width = Math.max(3, slot - 4);
                  const height = (point.value / max) * 100;
                  const x = 28 + index * slot + (slot - width) / 2;
                  return (
                    <g key={point.full}>
                      <rect className="cr-ins__hit" height="120" onBlur={() => setHover(null)} onFocus={() => setHover(index)} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} onClick={() => setHover(index)} tabIndex={0} width={slot} x={28 + index * slot} y="10" />
                      <rect className={hover === index ? 'cr-ins__bar cr-ins__bar--on' : 'cr-ins__bar'} height={Math.max(point.value > 0 ? 2 : 0, height)} rx="3" width={width} x={x} y={120 - Math.max(point.value > 0 ? 2 : 0, height)} />
                    </g>
                  );
                })}
                {[0, Math.floor((series.length - 1) / 2), series.length - 1].map((index) => (
                  <text className="cr-ins__axis" key={index} textAnchor={index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'} x={index === 0 ? 28 : index === series.length - 1 ? 316 : 28 + (index + 0.5) * (290 / series.length)} y="142">{series[index]?.label}</text>
                ))}
              </svg>
            )}
            <button className="cr-link cr-link--muted" onClick={() => setTable((value) => !value)} type="button">{table ? 'View as chart' : 'View as table'}</button>
          </section>

          <section aria-labelledby="ins-eng" className="cr-ins__card">
            <h2 id="ins-eng">How people engaged</h2>
            {[['Likes', totals.likes], ['Comments', totals.comments], ['Shares', totals.shares]].map(([label, value]) => (
              <div className="cr-ins__bar-row" key={label as string}>
                <span>{label}</span>
                <div className="cr-ins__track"><i style={{ width: `${Math.max(Number(value) > 0 ? 3 : 0, (Number(value) / Math.max(1, totals.likes, totals.comments, totals.shares)) * 100)}%` }} /></div>
                <b>{n(Number(value))}</b>
              </div>
            ))}
          </section>

          <section aria-labelledby="ins-aud" className="cr-ins__card">
            <h2 id="ins-aud">Who looked</h2>
            {detail.audience.guests + detail.audience.members === 0 ? <p className="cr-ins__muted">Nobody yet.</p> : (
              <>
                <div className="cr-ins__split" role="img" aria-label={`${detail.audience.members} members and ${detail.audience.guests} guests`}>
                  {detail.audience.members > 0 ? <i style={{ flex: detail.audience.members }} /> : null}
                  {detail.audience.guests > 0 ? <i className="cr-ins__split--alt" style={{ flex: detail.audience.guests }} /> : null}
                </div>
                <p className="cr-ins__legend"><span>Members <b>{n(detail.audience.members)}</b> ({percent(detail.audience.members, detail.audience.members + detail.audience.guests)})</span><span>Guests <b>{n(detail.audience.guests)}</b> ({percent(detail.audience.guests, detail.audience.members + detail.audience.guests)})</span></p>
              </>
            )}
          </section>

          <section aria-labelledby="ins-src" className="cr-ins__card">
            <h2 id="ins-src">Where views came from</h2>
            {detail.sources.length === 0 ? <p className="cr-ins__muted">No views yet. Links tagged like ?s=tiktok show up here.</p> : detail.sources.map((row) => (
              <div className="cr-ins__bar-row" key={row.source}>
                <span>{sourceLabel(row.source)}</span>
                <div className="cr-ins__track"><i style={{ width: `${Math.max(3, (row.views / Math.max(1, detail.sources[0].views)) * 100)}%` }} /></div>
                <b>{n(row.views)}</b>
              </div>
            ))}
          </section>

          {detail.peakHour !== null ? (
            <section aria-labelledby="ins-peak" className="cr-ins__card">
              <h2 id="ins-peak">Best time</h2>
              <p className="cr-ins__muted">Most views came around <b>{hourLabel(detail.peakHour)}</b>. Posting near that time tends to reach more people.</p>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
