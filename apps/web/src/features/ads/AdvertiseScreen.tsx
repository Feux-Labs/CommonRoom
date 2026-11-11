'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { SponsoredCard, type Ad } from '@/features/anonymous/SponsoredCard';
import { errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { removeUserMedia, uploadUserMedia } from '@/features/app/media';
import { institutions } from '@/lib/institutions';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, compressMedia, readVideoDuration } from '@/lib/media-compression';
import { createCampaign, fetchCampaigns, fetchPricing, OBJECTIVE_COPY, payForCampaign, setCampaignStatus, type Campaign, type Pricing } from './api';
import './ads.css';

const MAX_TARGETS = 15;
const STATUS_LABEL: Record<Campaign['status'], string> = { pending_payment: 'Waiting for payment', active: 'Live', paused: 'Paused', removed: 'Removed after a report' };

const townOf = (name: string) => { const index = name.lastIndexOf(','); return index > 0 ? name.slice(index + 1).trim() : ''; };
const STATES = [...new Set(institutions.map((item) => item.location))].sort();
const TOWNS = [...new Set(institutions.map((item) => townOf(item.name)).filter(Boolean))].sort();
const SCHOOLS = institutions.map((item) => item.name).sort();
const labelOf = (key: string) => key.replace(/^(country|state|town|school):/, '');

type Picker = 'state' | 'town' | 'school';
const PICKERS: Record<Picker, { title: string; list: string[] }> = {
  state: { title: 'Whole state', list: STATES },
  town: { title: 'Whole town', list: TOWNS },
  school: { title: 'Specific school', list: SCHOOLS },
};

/** Self-serve advertising: pick a goal, add your photo or video, choose where it runs, pay with Paystack, and it goes live. */
export function AdvertiseScreen() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [freeDays, setFreeDays] = useState(0);

  const [advertiser, setAdvertiser] = useState('');
  const [objective, setObjective] = useState<keyof typeof OBJECTIVE_COPY>('whatsapp');
  const [contact, setContact] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<string[]>(['country:Nigeria']);
  const [pickerOpen, setPickerOpen] = useState<Picker | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [days, setDays] = useState<1 | 5 | 7>(5);
  const [useFree, setUseFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const load = async () => {
    if (!account) return;
    try {
      const mine = await fetchCampaigns(account);
      setCampaigns(mine.campaigns);
      setFreeDays(mine.freeAdDays);
    } catch { setCampaigns([]); }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const prices = await fetchPricing();
        if (active) setPricing(prices);
      } catch { /* prices stay hidden; the button still works */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const mine = await fetchCampaigns(account);
        if (active) { setCampaigns(mine.campaigns); setFreeDays(mine.freeAdDays); }
      } catch {
        if (active) setCampaigns([]);
      }
    })();
    return () => { active = false; };
  }, [account]);

  const price = useFree ? 0 : pricing?.options.find((option) => option.days === days)?.priceNaira ?? null;
  const copy = OBJECTIVE_COPY[objective];
  const canSubmit = advertiser.trim().length > 0 && title.trim().length > 0 && contact.trim().length > 0 && targets.length > 0 && !busy;

  const preview: Ad = {
    id: 'preview', advertiser: advertiser.trim() || 'Your page name', title: title.trim() || 'Your headline', body: body.trim(), objective,
    ctaLabel: copy.button, linkUrl: objective === 'call' ? 'tel:+2348000000000' : '#',
    mediaType: file ? (file.type.startsWith('video/') ? 'video' : 'photo') : 'none', mediaUrl: previewUrl,
  };

  const pickFile = async (selected: File | null) => {
    setError('');
    if (!selected) { setFile(null); return; }
    if (selected.type.startsWith('video/')) {
      try {
        const seconds = await readVideoDuration(selected);
        if (seconds > MAX_VIDEO_SECONDS + 0.25) { setError(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds. Trim it and try again.`); return; }
      } catch { setError('This video could not be read. Try a different file.'); return; }
    }
    setFile(selected);
  };

  const toggleTarget = (key: string) => {
    setError('');
    setTargets((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_TARGETS) { setError(`You can choose up to ${MAX_TARGETS} places.`); return current; }
      return [...current, key];
    });
  };

  const submit = async () => {
    if (!account || !canSubmit) return;
    setBusy(true);
    setError('');
    let uploaded: string | null = null;
    try {
      let mediaPath: string | undefined;
      if (file) {
        const prepared = await compressMedia(file);
        if (prepared.type.startsWith('video/') && prepared.size > MAX_VIDEO_BYTES) throw new Error('This video is still too large after compression. Try a shorter one.');
        const result = await uploadUserMedia(account, prepared, 'ad-');
        uploaded = result.path;
        mediaPath = result.path;
      }
      const created = await createCampaign(account, { advertiser, objective, contact, title, body, mediaPath, targets, days: useFree ? undefined : days, useFreeDays: useFree });
      if (created.authorizationUrl) { window.location.assign(created.authorizationUrl); return; }
      setTitle(''); setBody(''); setFile(null); setUseFree(false);
      await load();
      setBusy(false);
    } catch (submitError) {
      if (uploaded) void removeUserMedia([uploaded]);
      setError(errorMessage(submitError, 'Your ad could not be created.'));
      setBusy(false);
    }
  };

  const pay = async (campaign: Campaign) => {
    if (!account) return;
    try {
      const checkout = await payForCampaign(account, campaign.id);
      window.location.assign(checkout.authorizationUrl);
    } catch (payError) {
      setError(errorMessage(payError, 'We could not start the payment.'));
    }
  };
  const toggle = async (campaign: Campaign) => {
    if (!account) return;
    try { await setCampaignStatus(account, campaign.id, campaign.status === 'active' ? 'paused' : 'active'); await load(); } catch (toggleError) { setError(errorMessage(toggleError, 'That did not work.')); }
  };

  const pickerList = pickerOpen ? PICKERS[pickerOpen].list.filter((item) => item.toLowerCase().includes(pickerQuery.trim().toLowerCase())).slice(0, 60) : [];

  return (
    <main className="cr-screen cr-adv">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Advertise</h1><p className="cr-hd__sub">Reach students in Anonymous, Room and Marketplace.</p></div>
      </header>

      {ready && !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in to run an ad. You’ll pay with Paystack." icon="user" title="Ads are for members" />
      ) : (
        <>
          <section className="cr-adv__card">
            <h2>1. Who is it from?</h2>
            <label>Page or business name<input aria-label="Page or business name" maxLength={60} onChange={(event) => setAdvertiser(event.target.value)} placeholder="e.g. Mama Put Express" value={advertiser} /></label>
          </section>

          <section className="cr-adv__card">
            <h2>2. What do you want?</h2>
            <div className="cr-adv__goals" role="radiogroup" aria-label="Goal">
              {(Object.keys(OBJECTIVE_COPY) as Array<keyof typeof OBJECTIVE_COPY>).map((key) => (
                <button aria-checked={objective === key} className={objective === key ? 'cr-adv__goal on' : 'cr-adv__goal'} key={key} onClick={() => { setObjective(key); setContact(''); }} role="radio" type="button">
                  <b>{OBJECTIVE_COPY[key].title}</b><span>{OBJECTIVE_COPY[key].help}</span>
                </button>
              ))}
            </div>
            <label>{copy.label}<input aria-label={copy.label} maxLength={300} onChange={(event) => setContact(event.target.value)} placeholder={copy.placeholder} value={contact} /></label>
            <p className="cr-adv__note">The button on your ad will say “{copy.button}”.</p>
          </section>

          <section className="cr-adv__card">
            <h2>3. Your ad</h2>
            <label>Headline<input aria-label="Headline" maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Jollof Friday: 2 for 1" value={title} /></label>
            <label>Text (optional)<textarea aria-label="Ad text" maxLength={200} onChange={(event) => setBody(event.target.value)} placeholder="Say a little more" rows={3} value={body} /></label>
            <label>Photo or video (optional)<input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" aria-label="Photo or video" onChange={(event) => void pickFile(event.target.files?.[0] ?? null)} type="file" /></label>
            <p className="cr-adv__note">Videos play silently on a loop. Up to {MAX_VIDEO_SECONDS} seconds. Put your number or link in step 2, not in the text.</p>
          </section>

          <section className="cr-adv__card">
            <h2>4. Where should it run?</h2>
            <div className="cr-adv__chips">
              {targets.map((key) => <button aria-label={`Remove ${labelOf(key)}`} className="cr-adv__chip" key={key} onClick={() => toggleTarget(key)} type="button">{key === 'country:Nigeria' ? 'All of Nigeria' : labelOf(key)} ✕</button>)}
            </div>
            <div className="cr-adv__adds">
              <button className="cr-ghost" disabled={targets.includes('country:Nigeria')} onClick={() => toggleTarget('country:Nigeria')} type="button">+ Whole of Nigeria</button>
              {(Object.keys(PICKERS) as Picker[]).map((key) => <button className="cr-ghost" key={key} onClick={() => { setPickerOpen(pickerOpen === key ? null : key); setPickerQuery(''); }} type="button">+ {PICKERS[key].title}</button>)}
            </div>
            {pickerOpen ? (
              <div className="cr-adv__picker">
                <input aria-label={`Search ${PICKERS[pickerOpen].title}`} autoFocus onChange={(event) => setPickerQuery(event.target.value)} placeholder={`Search ${PICKERS[pickerOpen].title.toLowerCase()}…`} value={pickerQuery} />
                <ul>
                  {pickerList.map((item) => {
                    const key = `${pickerOpen}:${item}`;
                    return <li key={key}><button aria-pressed={targets.includes(key)} onClick={() => toggleTarget(key)} type="button">{targets.includes(key) ? '✓ ' : ''}{item}</button></li>;
                  })}
                </ul>
              </div>
            ) : null}
            <p className="cr-adv__note">Pick as many as you like, for example your school and the whole of Ondo State. A person sees your ad if they are in any place you picked.</p>
          </section>

          <section className="cr-adv__card">
            <h2>5. How long?</h2>
            <div className="cr-adv__days" role="radiogroup" aria-label="Duration">
              {(pricing?.options ?? []).map((option) => (
                <button aria-checked={!useFree && days === option.days} className={!useFree && days === option.days ? 'cr-adv__day on' : 'cr-adv__day'} key={option.days} onClick={() => { setDays(option.days); setUseFree(false); }} role="radio" type="button">
                  <b>{option.days} {option.days === 1 ? 'day' : 'days'}</b><span>₦{option.priceNaira.toLocaleString()}</span>
                </button>
              ))}
            </div>
            {freeDays >= 2 ? (
              <label className="cr-adv__free"><input checked={useFree} onChange={(event) => setUseFree(event.target.checked)} type="checkbox" /> Use my {pricing?.freeAdDays ?? 2} free ad days (Pro). Runs for 2 days at no cost.</label>
            ) : null}
          </section>

          <section aria-label="Preview" className="cr-adv__card">
            <h2>Preview</h2>
            <SponsoredCard ad={preview} session={null} />
          </section>

          {error ? <p role="alert" style={{ color: '#b3261e', margin: '0 14px 8px' }}>{error}</p> : null}
          <button className="cr-pbtn cr-pbtn--l cr-adv__go" disabled={!canSubmit} onClick={() => void submit()} type="button">
            {busy ? 'Working…' : useFree ? 'Start my free ad' : price === null ? 'Continue to payment' : `Pay ₦${price.toLocaleString()} with Paystack`}
          </button>
          <p className="cr-adv__fine">Your ad goes live as soon as the payment is confirmed. Ads are labelled “Sponsored”, and anyone can report one. Ads that break the Community Guidelines are removed.</p>

          <h2 className="cr-adv__h2">Your ads</h2>
          {campaigns === null ? <p className="cr-empty-line" role="status">Loading…</p> : campaigns.length === 0 ? <p className="cr-empty-line">You haven’t run an ad yet.</p> : campaigns.map((campaign) => (
            <article className="cr-adv__mine" key={campaign.id}>
              <div className="cr-adv__mine-top"><b>{campaign.title}</b><span className={`cr-adv__status cr-adv__status--${campaign.status}`}>{STATUS_LABEL[campaign.status]}</span></div>
              <p className="cr-adv__note">{campaign.advertiser} · {campaign.days} {campaign.days === 1 ? 'day' : 'days'} · {campaign.priceNaira > 0 ? `₦${campaign.priceNaira.toLocaleString()}` : 'free'}{campaign.endsAt ? ` · ends ${new Date(campaign.endsAt).toLocaleDateString()}` : ''}</p>
              <p className="cr-adv__stats">{campaign.views} views · {campaign.people} people · {campaign.clicks} clicks · {campaign.views > 0 ? `${((campaign.clicks / campaign.views) * 100).toFixed(1)}% click rate` : 'no views yet'}</p>
              {campaign.status === 'pending_payment' ? <button className="cr-pbtn" onClick={() => void pay(campaign)} type="button">Pay now</button> : null}
              {campaign.status === 'active' || campaign.status === 'paused' ? <button className="cr-ghost" onClick={() => void toggle(campaign)} type="button">{campaign.status === 'active' ? 'Pause' : 'Resume'}</button> : null}
            </article>
          ))}
        </>
      )}
    </main>
  );
}
