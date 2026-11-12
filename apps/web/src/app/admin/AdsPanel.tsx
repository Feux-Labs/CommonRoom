'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { uploadUserMedia } from '@/features/app/media';
import { compressMedia } from '@/lib/media-compression';

const PLACEMENTS = [
  { key: 'anonymous_feed', label: 'Anonymous feed' },
  { key: 'room', label: 'Room' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'overlay', label: 'Overlay (full screen, rare, never for Pro)' },
] as const;

type AdItem = {
  id: string; advertiser: string; title: string; body: string; ctaLabel: string; linkUrl: string; school: string | null;
  startsAt: string; endsAt: string | null; status: string; views: number; clicks: number; people: number; selfServe?: boolean; priceNaira?: number;
  placements?: string[]; mediaType?: string; mediaUrl?: string | null;
};

async function adsRequest<T>(session: Session, method: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/v1/admin/ads', {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok || !result || !('data' in result)) throw new Error(result?.error?.message ?? `Request failed with status ${response.status}.`);
  return result.data as T;
}

/** Admin "Ads" tab: create sponsored cards sold to businesses, pause them, and read views, clicks and click rate. */
export function AdsPanel({ session }: { session: Session }) {
  const [ads, setAds] = useState<AdItem[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [graphic, setGraphic] = useState<{ path: string; url: string; video: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [placements, setPlacements] = useState<string[]>(['anonymous_feed', 'room', 'marketplace']);
  const [form, setForm] = useState({ advertiser: '', title: '', body: '', ctaLabel: 'Learn more', linkUrl: 'https://', imageUrl: '', school: '', days: '14' });

  const load = useCallback(async () => {
    try {
      setAds(await adsRequest<AdItem[]>(session, 'GET'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load ads.');
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) await load();
    })();
    return () => { active = false; };
  }, [load]);

  const pickGraphic = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const ready = await compressMedia(file);
      const stored = await uploadUserMedia(session, ready, 'ad-');
      setGraphic({ ...stored, video: ready.type.startsWith('video/') });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The graphic could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (placements.length === 0) { setError('Choose where the ad should show.'); return; }
    setBusy(true);
    setError('');
    try {
      await adsRequest(session, 'POST', { ...form, days: Number(form.days), placements, mediaPath: graphic?.path });
      setGraphic(null);
      setForm({ ...form, title: '', body: '', imageUrl: '' });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the ad.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (ad: AdItem) => {
    try { await adsRequest(session, 'PATCH', { id: ad.id, status: ad.status === 'active' ? 'paused' : 'active' }); await load(); } catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : 'Could not update.'); }
  };
  const remove = async (ad: AdItem) => {
    if (!confirm(`Delete the ad "${ad.title}"?`)) return;
    try { await adsRequest(session, 'DELETE', { id: ad.id }); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Could not delete.'); }
  };

  const field = (key: keyof typeof form, label: string, extra: { max?: number; type?: string } = {}) => (
    <label>{label}<input maxLength={extra.max} onChange={(event) => setForm({ ...form, [key]: event.target.value })} type={extra.type ?? 'text'} value={form[key]} /></label>
  );

  return (
    <section className="admin-panel admin-section">
      <header><div><h2>Sponsored ads</h2></div></header>
      <p className="admin-muted">Ads are always labelled “Sponsored”. Choose where each one runs. The full-screen overlay only ever shows an ad made for the overlay, and never to Pro members; with none, nothing appears. Views count once per person per hour.</p>
      {error ? <p role="alert" style={{ color: '#ff8a8a' }}>{error}</p> : null}

      <form className="admin-broadcast-form" onSubmit={(event) => void create(event)}>
        {field('advertiser', 'Advertiser', { max: 60 })}
        {field('title', 'Headline', { max: 80 })}
        {field('body', 'Text (optional)', { max: 200 })}
        {field('ctaLabel', 'Button label', { max: 24 })}
        {field('linkUrl', 'Link (https only)', { max: 500 })}
        <label>Graphic (photo or short video)
          <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" disabled={uploading} onChange={(event) => void pickGraphic(event.target.files?.[0])} type="file" />
        </label>
        {uploading ? <p className="admin-muted">Uploading…</p> : null}
        {graphic ? (graphic.video
          ? <video aria-label="Graphic preview" autoPlay loop muted playsInline src={graphic.url} style={{ maxWidth: 240, borderRadius: 8 }} />
          // eslint-disable-next-line @next/next/no-img-element
          : <img alt="Graphic preview" src={graphic.url} style={{ maxWidth: 240, borderRadius: 8 }} />) : null}
        {field('imageUrl', 'Or an image link (https, optional)', { max: 500 })}
        <fieldset>
          <legend>Where it shows</legend>
          {PLACEMENTS.map((place) => (
            <label key={place.key} style={{ display: 'block' }}>
              <input checked={placements.includes(place.key)} onChange={(event) => setPlacements(event.target.checked ? [...placements, place.key] : placements.filter((item) => item !== place.key))} type="checkbox" /> {place.label}
            </label>
          ))}
        </fieldset>
        {field('school', 'Only this school (optional, exact name)', { max: 120 })}
        {field('days', 'Runs for (days)', { type: 'number' })}
        <button className="admin-btn-action" disabled={busy || uploading} type="submit">{busy ? 'Creating…' : 'Create ad'}</button>
      </form>

      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Ad</th><th>Runs until</th><th>Views</th><th>People</th><th>Clicks</th><th>Click rate</th><th /></tr></thead>
          <tbody>
            {ads === null ? <tr><td colSpan={7}>Loading…</td></tr> : ads.length === 0 ? <tr><td colSpan={7}>No ads yet.</td></tr> : ads.map((ad) => (
              <tr key={ad.id}>
                <td><b>{ad.title}</b><br /><small>{ad.advertiser}{ad.school ? ` · ${ad.school}` : ''}{ad.placements?.length ? ` · ${ad.placements.join(', ')}` : ''}{ad.mediaType && ad.mediaType !== 'none' ? ` · ${ad.mediaType}` : ''}{ad.selfServe ? ` · self-serve · ₦${(ad.priceNaira ?? 0).toLocaleString()} · ${ad.status}` : ''}</small></td>
                <td>{ad.endsAt ? new Date(ad.endsAt).toLocaleDateString() : 'Not paid yet'}</td>
                <td>{ad.views}</td>
                <td>{ad.people}</td>
                <td>{ad.clicks}</td>
                <td>{ad.views > 0 ? `${((ad.clicks / ad.views) * 100).toFixed(1)}%` : '—'}</td>
                <td>
                  <button className="admin-btn-action" onClick={() => void toggle(ad)} type="button">{ad.status === 'active' ? 'Pause' : 'Resume'}</button>{' '}
                  <button className="admin-btn-action" onClick={() => void remove(ad)} type="button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
