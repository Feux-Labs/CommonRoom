'use client';

import { useEffect, useRef, useState } from 'react';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { apiRequest, errorMessage } from '@/features/app/api';
import { trackEvent } from '@/lib/analytics';
import './sponsored.css';

export type Ad = {
  id: string; advertiser: string; title: string; body: string; objective: string; ctaLabel: string; linkUrl: string;
  mediaType: 'none' | 'photo' | 'video'; mediaUrl: string | null;
};

type TokenHolder = { access_token: string };

/**
 * A sponsored post, laid out like a normal social ad: the advertiser's name and "Sponsored" on top, the words, the photo or
 * video (videos play silently in a loop while on screen), then the headline with one button that fits the advertiser's goal:
 * Visit website, Chat on WhatsApp or Call now. One view is counted when it is first seen, one click when the button is tapped.
 */
export function SponsoredCard({ ad, session }: { ad: Ad; session: TokenHolder | null }) {
  const ref = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reporting, setReporting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let counted = false;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      const video = videoRef.current;
      if (video) { if (visible) void video.play().catch(() => undefined); else video.pause(); }
      if (visible && !counted && session) {
        counted = true;
        trackEvent(session, 'ad_view', { kind: 'ad', id: ad.id });
      }
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ad.id, session]);

  const isCall = ad.linkUrl.startsWith('tel:');

  return (
    <article aria-label={`Sponsored by ${ad.advertiser}`} className="cr-ad" ref={ref}>
      <header className="cr-ad__head">
        <span aria-hidden="true" className="cr-ad__avatar">{ad.advertiser.slice(0, 1).toUpperCase()}</span>
        <div className="cr-ad__who">
          <b>{ad.advertiser}</b>
          <small>Sponsored</small>
        </div>
        <button aria-expanded={menu} aria-label="Ad options" className="cr-ad__more" onClick={() => setMenu((value) => !value)} type="button">⋯</button>
        {menu ? <button className="cr-ad__menu" onClick={() => { setMenu(false); setReporting(true); }} type="button">Report this ad</button> : null}
      </header>

      {ad.body ? <p className="cr-ad__body">{ad.body}</p> : null}

      {ad.mediaType === 'video' && ad.mediaUrl ? (
        <video aria-label={ad.title} className="cr-ad__media" loop muted playsInline preload="metadata" ref={videoRef} src={ad.mediaUrl} />
      ) : ad.mediaType === 'photo' && ad.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- advertiser media from our storage
        <img alt="" className="cr-ad__media" loading="lazy" src={ad.mediaUrl} />
      ) : null}

      <div className="cr-ad__foot">
        <p className="cr-ad__title">{ad.title}</p>
        <a
          className="cr-ad__cta"
          href={ad.linkUrl}
          onClick={() => trackEvent(session, 'ad_click', { kind: 'ad', id: ad.id })}
          rel={isCall ? undefined : 'sponsored noopener noreferrer'}
          target={isCall ? undefined : '_blank'}
        >{ad.ctaLabel}</a>
      </div>
      {notice ? <p className="cr-ad__notice" role="status">{notice}</p> : null}

      <ReportSheet
        context="Sponsored"
        onClose={() => setReporting(false)}
        onSubmit={async (reason, details) => {
          if (!session) return;
          try {
            await apiRequest('/api/v1/ads/report', { token: session.access_token, method: 'POST', body: { id: ad.id, reason: details ? `${reason}: ${details}` : reason } });
            setReporting(false);
            setNotice('Thanks. We’ll review this ad.');
          } catch (error) {
            throw new Error(errorMessage(error, 'Your report could not be sent.'));
          }
        }}
        open={reporting}
        subject="ad"
      />
    </article>
  );
}
