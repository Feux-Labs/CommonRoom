'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/cr/Avatars';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { SensitiveGate } from '@/components/cr/SensitiveGate';
import { ErrorBlock, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { ReportSheet } from '@/components/cr/ReportSheet';
import { ShareSheet } from '@/components/cr/ShareSheet';
import { useToast } from '@/components/cr/Toast';
import { ApiError, errorMessage, apiRequest } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { formatNaira, relativeAge } from '@/lib/format';
import type { ListingStatus, MarketplaceListing } from '@/lib/marketplace-contracts';
import {
  categoryLabel,
  conditionLabel,
  deleteListing,
  fetchListing,
  reportListing,
  statusLabel,
  toggleSaved,
  updateListing,
  whatsappNumber,
} from './api';

/** Mockups 26 (detail), 28 (owner view) and 34 (sold). */
export function ListingDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { session, account, ready, requireAccount } = useAppSession();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [photo, setPhoto] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const gallery = useRef<HTMLDivElement | null>(null);

  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void (async () => {
      try {
        const found = await fetchListing(session, id);
        if (!active) return;
        setListing(found);
        setStatus('ready');
      } catch (error) {
        if (active) setStatus(error instanceof ApiError && error.status === 404 ? 'missing' : 'error');
      }
    })();
    return () => { active = false; };
  }, [attempt, id, ready, session]);

  const messageSeller = async () => {
    if (!listing || !account || startingChat) return;
    setStartingChat(true);
    try {
      const { id: threadId } = await apiRequest<{ id: string }>('/api/v1/market/threads', { session: account, method: 'POST', body: { listingId: listing.id } });
      router.push(`/marketplace/messages/${threadId}`);
    } catch (error) {
      toast.show(errorMessage(error, 'The conversation could not be started.'), 'error');
      setStartingChat(false);
    }
  };

  const save = async () => {
    if (!listing || !requireAccount('sign-in') || !account) return;
    const next = !listing.is_saved;
    setListing({ ...listing, is_saved: next });
    try {
      const result = await toggleSaved(account, listing.id);
      setListing((current) => (current ? { ...current, is_saved: result.saved } : current));
      toast.show(result.saved ? 'Saved' : 'Removed from saved');
    } catch (error) {
      setListing((current) => (current ? { ...current, is_saved: !next } : current));
      toast.show(errorMessage(error, 'This listing could not be saved.'), 'error');
    }
  };

  const setListingStatus = async (next: ListingStatus) => {
    if (!listing || !account) return;
    setBusy(true);
    try {
      const updated = await updateListing(account, listing.id, { status: next });
      setListing((current) => (current ? { ...current, ...updated, status: updated.status ?? next } : current));
      toast.show(next === 'sold' ? 'Marked as sold' : next === 'reserved' ? 'Marked as unavailable' : 'Listing is active');
    } catch (error) {
      toast.show(errorMessage(error, 'This listing could not be updated.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!listing || !account) return;
    setBusy(true);
    try {
      await deleteListing(account, listing.id);
      toast.show('Listing deleted');
      router.push('/marketplace');
    } catch (error) {
      toast.show(errorMessage(error, 'This listing could not be deleted.'), 'error');
      setBusy(false);
    }
  };

  const onGalleryScroll = () => {
    const node = gallery.current;
    if (!node) return;
    setPhoto(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
  };

  if (status === 'loading') {
    return (
      <main aria-busy="true" className="cr-screen">
        <header className="cr-hd"><button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/marketplace')} type="button"><Icon name="back" /></button></header>
        <i className="cr-sk" style={{ height: 260, borderRadius: 16 }} />
        <i className="cr-sk" style={{ width: '70%', height: 14, marginTop: 16 }} />
        <i className="cr-sk" style={{ width: '30%', height: 18, marginTop: 10 }} />
      </main>
    );
  }

  if (status !== 'ready' || !listing) {
    return (
      <main className="cr-screen">
        <header className="cr-hd"><button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/marketplace')} type="button"><Icon name="back" /></button></header>
        {status === 'missing'
          ? <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/marketplace">Back to Market</Link>} description="It may have been deleted by the seller." icon="bag" title="Listing not found" />
          : <ErrorBlock description="Check your connection and try again." onRetry={reload} title="Couldn’t load this listing" />}
      </main>
    );
  }

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/marketplace/${listing.id}`;
  const sold = listing.status === 'sold';
  const waNumber = listing.seller_phone ? whatsappNumber(listing.seller_phone) : null;

  if (listing.is_mine) {
    return (
      <main className="cr-screen">
        <header className="cr-hd">
          <button aria-label="Back" className="cr-icon-btn" onClick={() => router.push('/marketplace')} type="button"><Icon name="back" /></button>
          <h1 className="cr-hd__t">Your listing</h1>
          <button aria-label="Share listing" className="cr-icon-btn" onClick={() => setShareOpen(true)} type="button"><Icon name="up" /></button>
        </header>
        <div className="cr-owner">
          <span className="cr-tile cr-owner__tile">
            {/* eslint-disable-next-line @next/next/no-img-element -- listing photo */}
            {listing.images[0] ? <img alt="" src={listing.images[0]} /> : <Icon name="bag" />}
          </span>
          <div>
            <p className="cr-owner__title">{listing.title}</p>
            <p className="cr-pr">{formatNaira(listing.price)}</p>
            <span className={listing.status === 'available' ? 'cr-badge' : 'cr-badge cr-badge--muted'}>{statusLabel(listing.status)}</span>
          </div>
        </div>
        <div className="cr-stats">
          <div><b>{listing.views_count}</b>Views</div>
          <div><b>{listing.likes_count}</b>Saves</div>
        </div>
        <Link className="cr-row-btn" href={`/marketplace/${listing.id}/edit`}><span className="cr-row-btn__main"><span className="cr-row-btn__title">Edit listing</span></span><Icon name="rt" /></Link>
        {listing.status !== 'sold' ? (
          <button className="cr-row-btn" disabled={busy} onClick={() => void setListingStatus('sold')} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Mark as sold</span></span><Icon name="rt" /></button>
        ) : null}
        {listing.status === 'available' ? (
          <button className="cr-row-btn" disabled={busy} onClick={() => void setListingStatus('reserved')} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Mark as unavailable</span></span><Icon name="rt" /></button>
        ) : (
          <button className="cr-row-btn" disabled={busy} onClick={() => void setListingStatus('available')} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Make active again</span></span><Icon name="rt" /></button>
        )}
        <button className="cr-row-btn cr-row-btn--danger" disabled={busy} onClick={() => setDeleteOpen(true)} type="button"><span className="cr-row-btn__main"><span className="cr-row-btn__title">Delete listing</span></span><Icon name="rt" /></button>
        <p className="cr-note">Buyers contact you on the phone number in your listing.</p>

        <ShareSheet onClose={() => setShareOpen(false)} open={shareOpen} text={`${listing.title} · ${formatNaira(listing.price)}`} title="Share listing" url={shareUrl} />
        <BottomSheet description="This can’t be undone." onClose={() => setDeleteOpen(false)} open={deleteOpen} title="Delete this listing?">
          <div className="cr-acts">
            <button className="cr-ghost cr-ghost--l" onClick={() => setDeleteOpen(false)} type="button">Cancel</button>
            <button className="cr-pbtn cr-pbtn--l cr-pbtn--danger" disabled={busy} onClick={() => void remove()} type="button">{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
        </BottomSheet>
      </main>
    );
  }

  return (
    <main className="cr-screen cr-screen--nonav cr-listing">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__actions">
          {!sold ? <button aria-label={listing.is_saved ? 'Unsave' : 'Save'} aria-pressed={listing.is_saved} className={listing.is_saved ? 'cr-icon-btn is-filled' : 'cr-icon-btn'} onClick={() => void save()} type="button"><Icon name="heart" /></button> : null}
          <button aria-label="Share listing" className="cr-icon-btn" onClick={() => setShareOpen(true)} type="button"><Icon name="up" /></button>
        </div>
      </header>

      <SensitiveGate active={listing.images_sensitive === true}>
      <div className="cr-gallery" onScroll={onGalleryScroll} ref={gallery}>
        {(listing.images.length ? listing.images : ['']).map((src, index) => (
          <div className="cr-tile cr-tile--xl" key={`${src}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- listing photo */}
            {src ? <img alt={`${listing.title}, photo ${index + 1}`} src={src} /> : <Icon name="bag" />}
            {sold && index === 0 ? <span className="cr-tag">Sold</span> : null}
          </div>
        ))}
      </div>
      </SensitiveGate>
      {listing.images.length > 1 ? (
        <div aria-hidden="true" className="cr-pg">{listing.images.map((src, index) => <i className={index === photo ? 'on' : undefined} key={`${src}-dot-${index}`} />)}</div>
      ) : null}

      {sold ? <p className="cr-inf">This item has been sold. You can no longer contact the seller.</p> : null}

      <h1 className={sold ? 'cr-ttl cr-ttl--muted' : 'cr-ttl'}>{listing.title}</h1>
      <p className={sold ? 'cr-pr cr-pr--muted' : 'cr-pr'}>{formatNaira(listing.price)}</p>
      <p className="cr-meta"><Icon name="pin" />{listing.location} · {relativeAge(listing.created_at)}</p>
      {!sold ? (
        <div className="cr-chips cr-listing__chips">
          <span className="cr-chip">{categoryLabel(listing.category)}</span>
          <span className="cr-chip">{conditionLabel(listing.condition)}</span>
        </div>
      ) : null}
      {listing.description && !sold ? <p className="cr-ds">{listing.description}</p> : null}

      <hr className="cr-hr" />
      <div className="cr-sell">
        <UserAvatar name={listing.seller_name} src={listing.seller_avatar} tone="mid" />
        <div className="cr-sell__main">
          <p className="cr-sell__name">{listing.seller_name}</p>
          <p className="cr-sell__sub">{listing.seller_school ?? (listing.seller_username ? `@${listing.seller_username}` : 'Student')}</p>
        </div>
        <Link className="cr-link" href={`/u/${listing.seller_id}`}>View profile</Link>
      </div>
      <hr className="cr-hr" />

      <div className="cr-bb">
        {sold ? (
          <>
            <button className="cr-pbtn cr-pbtn--block" disabled type="button">Sold</button>
            <Link className="cr-ghost cr-ghost--l" href="/marketplace">See similar items</Link>
          </>
        ) : (
          <>
            <button className="cr-pbtn cr-pbtn--block" disabled={listing.status !== 'available'} onClick={() => { if (requireAccount('sign-in')) setContactOpen(true); }} type="button">
              {listing.status === 'available' ? 'Contact seller' : 'Unavailable'}
            </button>
            <button aria-label={listing.is_saved ? 'Unsave' : 'Save'} aria-pressed={listing.is_saved} className={listing.is_saved ? 'cr-ghost cr-ghost--square is-filled' : 'cr-ghost cr-ghost--square'} onClick={() => void save()} type="button"><Icon name="heart" /></button>
            <button aria-label="Report listing" className="cr-ghost cr-ghost--square" onClick={() => { if (requireAccount('sign-in')) setReportOpen(true); }} type="button"><Icon name="flag" /></button>
          </>
        )}
      </div>

      <ShareSheet onClose={() => setShareOpen(false)} open={shareOpen} text={`${listing.title} · ${formatNaira(listing.price)}`} title="Share listing" url={shareUrl} />
      <ReportSheet
        context="Listing"
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason, details) => {
          if (!account) return;
          await reportListing(account, listing.id, reason, details);
          setReportOpen(false);
          toast.show('Report sent');
        }}
        open={reportOpen}
        subject="listing"
      />
      <BottomSheet context={listing.title} description="Meet in a public place on campus and check the item before you pay." onClose={() => setContactOpen(false)} open={contactOpen} title={`Contact ${listing.seller_name}`}>
        <div className="cr-contact">
          <button className="cr-pbtn cr-pbtn--l" disabled={startingChat} onClick={() => void messageSeller()} type="button">{startingChat ? 'Opening…' : 'Message seller'}</button>
        </div>
        {listing.seller_phone ? (
          <div className="cr-contact">
            {waNumber ? (
              <a className="cr-pbtn cr-pbtn--l" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, is "${listing.title}" on Common Room still available?`)}`} rel="noopener noreferrer" target="_blank">WhatsApp</a>
            ) : null}
            <a className="cr-ghost cr-ghost--l" href={`tel:${listing.seller_phone.replace(/[^\d+]/g, '')}`}>Call {listing.seller_phone}</a>
          </div>
        ) : (
          <p className="cr-note">This seller hasn’t shared a phone number. Visit their profile to reach them.</p>
        )}
      </BottomSheet>
    </main>
  );
}
