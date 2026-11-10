'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { ProgressBar } from '@/components/cr/primitives';
import { useToast } from '@/components/cr/Toast';
import { errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { removeUserMedia, uploadUserMedia } from '@/features/app/media';
import { compressMedia } from '@/lib/media-compression';
import type { ListingCondition, MarketplaceCategory, MarketplaceListing } from '@/lib/marketplace-contracts';
import { CATEGORY_CHIPS, CONDITION_OPTIONS, MAX_LISTING_PHOTOS, createListing, fetchListing, updateListing } from './api';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type Photo = { kind: 'existing'; url: string } | { kind: 'new'; file: File; preview: string };

/** Mockup 27. Creates a listing, or edits one when `listingId` is set. */
export function SellListing({ listingId }: { listingId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { account, profile } = useAppSession();
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error' | 'forbidden'>(listingId ? 'loading' : 'ready');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | ''>('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<ListingCondition>('like_new');
  const [location, setLocation] = useState(listingId ? '' : profile?.school ?? '');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!listingId || !account) return;
    let active = true;
    fetchListing(account, listingId)
      .then((listing: MarketplaceListing) => {
        if (!active) return;
        if (!listing.is_mine) {
          setLoadState('forbidden');
          return;
        }
        setPhotos(listing.images.map((url) => ({ kind: 'existing' as const, url })));
        setTitle(listing.title);
        setCategory(listing.category);
        setPrice(String(listing.price));
        setCondition(listing.condition === 'fair' ? 'good' : listing.condition);
        setLocation(listing.location);
        setPhone(listing.seller_phone ?? '');
        setDescription(listing.description);
        setLoadState('ready');
      })
      .catch(() => { if (active) setLoadState('error'); });
    return () => { active = false; };
  }, [account, listingId]);

  const previews = photos;
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  // Revoke object URLs only when leaving the screen; removed photos are revoked in removePhoto.
  useEffect(() => () => {
    photosRef.current.forEach((photo) => { if (photo.kind === 'new') URL.revokeObjectURL(photo.preview); });
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      const target = current[index];
      if (target?.kind === 'new') URL.revokeObjectURL(target.preview);
      return current.filter((_, position) => position !== index);
    });
  };

  const addFiles = (files: File[]) => {
    const room = MAX_LISTING_PHOTOS - photos.length;
    if (files.some((file) => !PHOTO_TYPES.includes(file.type))) {
      setPhotoError('Use JPG, PNG or WebP photos.');
      return;
    }
    if (files.some((file) => file.size > MAX_PHOTO_BYTES)) {
      setPhotoError('Each photo must be under 10 MB.');
      return;
    }
    if (files.length > room) setPhotoError(`You can add up to ${MAX_LISTING_PHOTOS} photos.`);
    else setPhotoError('');
    const accepted = files.slice(0, Math.max(0, room)).map((file) => ({ kind: 'new' as const, file, preview: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...accepted]);
  };

  const priceNumber = Number(price);
  const valid = photos.length > 0 && title.trim().length >= 3 && description.trim().length >= 5 && category !== '' && Number.isFinite(priceNumber) && priceNumber > 0 && location.trim().length > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account || !valid || saving || !category) return;
    setSaving(true);
    setError('');
    const uploaded: string[] = [];
    try {
      const urls: string[] = [];
      const fresh = photos.filter((photo) => photo.kind === 'new').length;
      let done = 0;
      setProgress(fresh ? 0 : null);
      for (const photo of photos) {
        if (photo.kind === 'existing') {
          urls.push(photo.url);
          continue;
        }
        const compressed = await compressMedia(photo.file);
        const result = await uploadUserMedia(account, compressed, 'listing-');
        uploaded.push(result.path);
        urls.push(result.url);
        done += 1;
        setProgress((done / fresh) * 100);
      }
      const body = {
        title: title.trim(),
        description: description.trim(),
        price: Math.round(priceNumber),
        category,
        condition,
        location: location.trim(),
        school: profile?.school ?? null,
        images: urls,
        contact_phone: phone.trim() || undefined,
      };
      const saved = listingId ? await updateListing(account, listingId, body) : await createListing(account, body);
      toast.show(listingId ? 'Listing updated' : 'Your listing is live');
      router.push(`/marketplace/${saved.id ?? listingId}`);
    } catch (submitError) {
      await removeUserMedia(uploaded);
      setError(errorMessage(submitError, 'Your listing could not be saved. Try again.'));
      setProgress(null);
      setSaving(false);
    }
  };

  if (loadState !== 'ready') {
    return (
      <main className="cr-screen cr-screen--nonav">
        <header className="cr-hd"><button aria-label="Close" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="x" /></button></header>
        {loadState === 'loading' ? <i className="cr-sk" style={{ height: 62, borderRadius: 12 }} /> : null}
        {loadState === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={() => router.refresh()} title="Couldn’t load this listing" /> : null}
        {loadState === 'forbidden' ? <ErrorBlock description="You can only edit your own listings." onRetry={() => router.push('/marketplace')} title="Not your listing" /> : null}
      </main>
    );
  }

  return (
    <main className="cr-screen cr-screen--nonav cr-sellform">
      <form noValidate onSubmit={(event) => void submit(event)}>
        <header className="cr-hd">
          <button aria-label="Close" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="x" /></button>
          <h1 className="cr-hd__t">{listingId ? 'Edit listing' : 'Sell an item'}</h1>
          <button className="cr-pbtn" disabled={!valid || saving} type="submit">{saving ? 'Saving…' : listingId ? 'Save' : 'Post'}</button>
        </header>

        <div className="cr-photos" role="group" aria-label="Photos">
          {previews.map((photo, index) => (
            <div className="cr-ph1 fill" key={photo.kind === 'existing' ? photo.url : photo.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element -- listing photo preview */}
              <img alt="" src={photo.kind === 'existing' ? photo.url : photo.preview} />
              {index === 0 ? <span className="cr-tag cr-tag--bottom">Cover</span> : null}
              {!saving ? <button aria-label={`Remove photo ${index + 1}`} className="cr-create__remove" onClick={() => removePhoto(index)} type="button"><Icon name="x" /></button> : null}
            </div>
          ))}
          {Array.from({ length: MAX_LISTING_PHOTOS - photos.length }, (_, index) => (
            <button aria-label="Add photo" className="cr-ph1" disabled={saving} key={`slot-${index}`} onClick={() => fileInput.current?.click()} type="button"><Icon name="plus" /></button>
          ))}
        </div>
        <p className={photoError ? 'cr-msg cr-msg--e' : 'cr-msg'}>{photoError || `Add up to ${MAX_LISTING_PHOTOS} photos. The first is the cover.`}</p>
        {progress !== null ? <div className="cr-create__progress cr-create__progress--flush"><ProgressBar label="Upload progress" value={progress} /><p className="cr-note">Uploading photos {Math.round(progress)}%</p></div> : null}

        <label className="cr-label" htmlFor="cr-sell-title">Title</label>
        <div className="cr-input"><input disabled={saving} id="cr-sell-title" maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="What are you selling?" value={title} /></div>

        <div className="cr-two">
          <div>
            <label className="cr-label" htmlFor="cr-sell-category">Category</label>
            <select className="cr-select" disabled={saving} id="cr-sell-category" onChange={(event) => setCategory(event.target.value as MarketplaceCategory)} value={category}>
              <option disabled value="">Select</option>
              {CATEGORY_CHIPS.filter((chip) => chip.id !== 'all').map((chip) => <option key={chip.id} value={chip.id}>{chip.label}</option>)}
            </select>
          </div>
          <div>
            <label className="cr-label" htmlFor="cr-sell-price">Price</label>
            <div className="cr-input"><span aria-hidden="true" className="cr-input__prefix">₦</span><input disabled={saving} id="cr-sell-price" inputMode="numeric" onChange={(event) => setPrice(event.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="0" value={price} /></div>
          </div>
        </div>

        <span className="cr-label" id="cr-sell-condition">Condition</span>
        <div aria-labelledby="cr-sell-condition" className="cr-chips" role="radiogroup">
          {CONDITION_OPTIONS.map((option) => (
            <button aria-checked={condition === option.id} className={condition === option.id ? 'cr-chip on' : 'cr-chip'} disabled={saving} key={option.id} onClick={() => setCondition(option.id)} role="radio" type="button">{option.label}</button>
          ))}
        </div>

        <label className="cr-label" htmlFor="cr-sell-location">Location</label>
        <div className="cr-input"><Icon name="pin" /><input disabled={saving} id="cr-sell-location" maxLength={120} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Block C, Faculty gate" value={location} /></div>

        <label className="cr-label" htmlFor="cr-sell-phone">Phone for buyers (optional)</label>
        <div className="cr-input"><input autoComplete="tel" disabled={saving} id="cr-sell-phone" inputMode="tel" maxLength={20} onChange={(event) => setPhone(event.target.value)} placeholder="080…" value={phone} /></div>

        <label className="cr-label" htmlFor="cr-sell-description">Description</label>
        <textarea className="cr-textarea" disabled={saving} id="cr-sell-description" maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder="Add details buyers should know" rows={3} value={description} />
        <p className="cr-msg">At least 5 characters.</p>

        {error ? <div className="cr-create__error" role="alert"><span>{error}</span></div> : null}
      </form>
      <input
        accept={PHOTO_TYPES.join(',')}
        className="cr-visually-hidden"
        multiple
        onChange={(event) => { addFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />
    </main>
  );
}
