'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/cr/BottomSheet';
import { ErrorBlock, GridSkeleton, StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { useToast } from '@/components/cr/Toast';
import { apiRequest, errorMessage } from '@/features/app/api';
import { SponsoredCard, type Ad } from '@/features/anonymous/SponsoredCard';
import { useAppSession } from '@/features/app/AppSession';
import { cacheGet, cacheSet } from '@/lib/client-cache';
import { formatNaira, relativeAge } from '@/lib/format';
import { institutions } from '@/lib/institutions';
import type { MarketplaceListing } from '@/lib/marketplace-contracts';
import {
  CATEGORY_CHIPS,
  CONDITION_OPTIONS,
  DEFAULT_QUERY,
  SORT_OPTIONS,
  fetchListings,
  toggleSaved,
  type MarketQuery,
  type MarketTab,
} from './api';

const TABS: { id: MarketTab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'saved', label: 'Saved' },
  { id: 'my_listings', label: 'My listings' },
];

/** Marketplace screen with mockups 29 (filters), 30 (location), 32 (saved), 33 (no results), 75 (loading). */
export function MarketBrowse() {
  const router = useRouter();
  const toast = useToast();
  const { session, account, ready, requireAccount } = useAppSession();
  const [ad, setAd] = useState<Ad | null>(null);
  const [query, setQuery] = useState<MarketQuery>(DEFAULT_QUERY);

  // One sponsored post for this person, if any. A failed lookup just means no ad.
  useEffect(() => {
    if (!session) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const found = await apiRequest<Ad | null>('/api/v1/ads?placement=marketplace', { session });
        if (active) setAd(found);
      } catch {
        if (active) setAd(null);
      }
    })();
    return () => { active = false; };
  }, [session]);
  const [searchDraft, setSearchDraft] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const request = useRef(0);
  const [retries, setRetries] = useState(0);
  // The latest result, tagged with the query it answers. Loading is derived: a result for an older query counts as loading.
  const [result, setResult] = useState<{ key: string; listings: MarketplaceListing[]; failed: boolean } | null>(null);
  const queryKey = JSON.stringify(query);
  const status: 'loading' | 'ready' | 'error' = result?.key === queryKey ? (result.failed ? 'error' : 'ready') : 'loading';
  const listings = result?.listings ?? [];
  const updateListings = (change: (current: MarketplaceListing[]) => MarketplaceListing[]) => {
    setResult((current) => (current ? { ...current, listings: change(current.listings) } : current));
  };

  useEffect(() => {
    if (!ready) return;
    const id = ++request.current;
    // What this person already loaded for this search is shown at once; the fresh answer replaces it quietly.
    const cacheKey = `market:${session?.user.id ?? 'public'}:${queryKey}`;
    void (async () => {
      await Promise.resolve();
      const cachedListings = cacheGet<MarketplaceListing[]>(cacheKey);
      if (cachedListings && id === request.current) setResult({ key: queryKey, listings: cachedListings, failed: false });
      try {
        const found = await fetchListings(session, query);
        if (id !== request.current) return;
        cacheSet(cacheKey, found);
        setResult({ key: queryKey, listings: found, failed: false });
      } catch {
        // A failed refresh keeps showing the cached listings; with nothing cached it shows the error.
        if (id === request.current && !cachedListings) setResult({ key: queryKey, listings: [], failed: true });
      }
    })();
  }, [query, queryKey, ready, retries, session]);

  // Debounce typing into the search box.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) => (current.search === searchDraft ? current : { ...current, search: searchDraft }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const setTab = (tab: MarketTab) => {
    if (tab !== 'explore' && !requireAccount('sign-in')) return;
    setQuery((current) => ({ ...current, tab }));
  };

  const save = async (listing: MarketplaceListing) => {
    if (!requireAccount('sign-in') || !account) return;
    const next = !listing.is_saved;
    updateListings((list) => list.map((item) => (item.id === listing.id ? { ...item, is_saved: next } : item)));
    try {
      const result = await toggleSaved(account, listing.id);
      updateListings((list) => {
        const updated = list.map((item) => (item.id === listing.id ? { ...item, is_saved: result.saved } : item));
        return query.tab === 'saved' ? updated.filter((item) => item.is_saved) : updated;
      });
    } catch (error) {
      updateListings((list) => list.map((item) => (item.id === listing.id ? { ...item, is_saved: listing.is_saved } : item)));
      toast.show(errorMessage(error, 'This listing could not be saved.'), 'error');
    }
  };

  const sell = () => {
    if (requireAccount('sign-up-email')) router.push('/marketplace/sell');
  };

  const filtersActive = query.sort !== 'newest' || query.minPrice !== '' || query.maxPrice !== '' || query.conditions.length > 0;
  const sortLabel = SORT_OPTIONS.find((option) => option.id === query.sort)?.label ?? 'Newest';
  const hasQuery = query.search.trim() !== '' || query.category !== 'all' || filtersActive || query.school !== '';

  return (
    <main className="cr-screen cr-market">
      <header className="cr-hd">
        <h1 className="cr-hd__big">Market</h1>
        <div className="cr-hd__actions">
          <Link aria-label="Messages" className="cr-icon-btn" href="/marketplace/messages"><Icon name="cmt" /></Link>
          <button className="cr-pbtn cr-pbtn--l" onClick={sell} type="button"><Icon name="plus" />Sell</button>
        </div>
      </header>

      <div className="cr-sch">
        <Icon name="srch" />
        <input aria-label="Search listings" enterKeyHint="search" onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search listings" type="search" value={searchDraft} />
        <button aria-label="Filters and sort" className="cr-icon-btn" onClick={() => setFiltersOpen(true)} type="button">
          <Icon name="sliders" />
          {filtersActive ? <span aria-hidden="true" className="cr-icon-btn__dot" /> : null}
        </button>
      </div>

      <div className="cr-tabbar cr-market__tabs" role="tablist" aria-label="Market sections">
        {TABS.map((tab) => (
          <button aria-selected={query.tab === tab.id} key={tab.id} onClick={() => setTab(tab.id)} role="tab" type="button">{tab.label}</button>
        ))}
      </div>

      {query.tab === 'explore' ? (
        <>
          <div className="cr-chips cr-chips--scroll cr-market__cats" role="group" aria-label="Category">
            {CATEGORY_CHIPS.map((chip) => (
              <button aria-pressed={query.category === chip.id} className={query.category === chip.id ? 'cr-chip on' : 'cr-chip'} key={chip.id} onClick={() => setQuery((current) => ({ ...current, category: chip.id }))} type="button">{chip.label}</button>
            ))}
          </div>
          <div className="cr-sp cr-market__meta">
            <button className="cr-market__near" onClick={() => setLocationOpen(true)} type="button"><Icon name="pin" />{query.school ? query.school : 'All campuses'}</button>
            <button className="cr-market__sort" onClick={() => setFiltersOpen(true)} type="button">Sort: {sortLabel}</button>
          </div>
        </>
      ) : null}

      {status === 'loading' ? <GridSkeleton /> : null}
      {status === 'error' ? <ErrorBlock description="Check your connection and try again." onRetry={() => { setResult(null); setRetries((value) => value + 1); }} title="Couldn’t load listings" /> : null}

      {status === 'ready' && listings.length === 0 ? (
        query.tab === 'saved' ? (
          <StateBlock description="Tap the heart on a listing to keep it here." icon="heart" title="Nothing saved yet" />
        ) : query.tab === 'my_listings' ? (
          <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={sell} type="button">Sell an item</button>} description="Things you list will show up here." icon="bag" title="You haven’t listed anything" />
        ) : hasQuery ? (
          <StateBlock
            actions={<button className="cr-ghost cr-ghost--l" onClick={() => { setSearchDraft(''); setQuery({ ...DEFAULT_QUERY }); }} type="button">Clear filters</button>}
            description={query.search.trim() ? `Nothing matches “${query.search.trim()}”. Try a different word or fewer filters.` : 'Try fewer filters or another campus.'}
            icon="srch"
            title="No results"
          />
        ) : (
          <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={sell} type="button">Sell an item</button>} description="Be the first to list something." icon="bag" title="No listings yet" />
        )
      ) : null}

      {status === 'ready' && listings.length > 0 ? (
        <ul className="cr-g2" aria-label="Listings">
          {listings.map((listing, listingIndex) => (
            <Fragment key={listing.id}>
            <li className={listing.status === 'sold' ? 'cr-li cr-li--sold' : 'cr-li'}>
              <Link className="cr-li__link" href={`/marketplace/${listing.id}`}>
                <span className="cr-tile">
                  {listing.images[0]
                    // eslint-disable-next-line @next/next/no-img-element -- listing photos from Supabase Storage
                    ? <img alt="" loading="lazy" src={listing.images[0]} style={listing.images_sensitive ? { filter: 'blur(14px)' } : undefined} />
                    : <Icon name="bag" />}
                  {listing.status === 'sold' ? <span className="cr-tag">Sold</span> : null}
                  {listing.status === 'reserved' ? <span className="cr-tag">Unavailable</span> : null}
                </span>
                <span className="cr-li__n">{listing.title}</span>
                <span className="cr-li__p">{formatNaira(listing.price)}</span>
                <span className="cr-li__m">{listing.location} · {relativeAge(listing.created_at)}</span>
              </Link>
              {!listing.is_mine ? (
                <button aria-label={listing.is_saved ? `Unsave ${listing.title}` : `Save ${listing.title}`} aria-pressed={listing.is_saved} className={listing.is_saved ? 'cr-hbtn on' : 'cr-hbtn'} onClick={() => void save(listing)} type="button">
                  <Icon name="heart" />
                </button>
              ) : null}
            </li>
            {ad && listings.length >= 2 && listingIndex === Math.min(3, listings.length - 1) ? <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}><SponsoredCard ad={ad} session={session} /></li> : null}
            </Fragment>
          ))}
        </ul>
      ) : null}
      {status === 'ready' && listings.length >= 50 ? <p className="cr-listfoot">Showing the 50 most relevant listings. Narrow your search to see more.</p> : null}

      <FiltersSheet
        onApply={(next) => { setQuery((current) => ({ ...current, ...next })); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
        onOpenLocation={() => { setFiltersOpen(false); setLocationOpen(true); }}
        open={filtersOpen}
        query={query}
      />
      <LocationSheet
        onClose={() => setLocationOpen(false)}
        onSelect={(school) => { setQuery((current) => ({ ...current, school })); setLocationOpen(false); }}
        open={locationOpen}
        selected={query.school}
      />
    </main>
  );
}

function FiltersSheetBody({
  open,
  query,
  onClose,
  onApply,
  onOpenLocation,
}: {
  open: boolean;
  query: MarketQuery;
  onClose: () => void;
  onApply: (next: Partial<MarketQuery>) => void;
  onOpenLocation: () => void;
}) {
  const [draft, setDraft] = useState(query);
  const priceInvalid = draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice);

  return (
    <BottomSheet context="Market" onClose={onClose} open={open} title="Filters">
      <button className="cr-link cr-sheet-reset" onClick={() => setDraft({ ...draft, sort: 'newest', category: 'all', minPrice: '', maxPrice: '', conditions: [] })} type="button">Reset</button>
      <span className="cr-label">Sort by</span>
      <div className="cr-chips" role="radiogroup" aria-label="Sort by">
        {SORT_OPTIONS.map((option) => (
          <button aria-checked={draft.sort === option.id} className={draft.sort === option.id ? 'cr-chip on' : 'cr-chip'} key={option.id} onClick={() => setDraft({ ...draft, sort: option.id })} role="radio" type="button">{option.label}</button>
        ))}
      </div>
      <span className="cr-label">Category</span>
      <div className="cr-chips" role="radiogroup" aria-label="Category">
        {CATEGORY_CHIPS.map((chip) => (
          <button aria-checked={draft.category === chip.id} className={draft.category === chip.id ? 'cr-chip on' : 'cr-chip'} key={chip.id} onClick={() => setDraft({ ...draft, category: chip.id })} role="radio" type="button">{chip.label}</button>
        ))}
      </div>
      <span className="cr-label">Price</span>
      <div className="cr-two">
        <div className="cr-input"><input aria-label="Minimum price in naira" inputMode="numeric" min={0} onChange={(event) => setDraft({ ...draft, minPrice: event.target.value.replace(/\D/g, '') })} placeholder="Min ₦" value={draft.minPrice} /></div>
        <div className={priceInvalid ? 'cr-input e' : 'cr-input'}><input aria-label="Maximum price in naira" inputMode="numeric" min={0} onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value.replace(/\D/g, '') })} placeholder="Max ₦" value={draft.maxPrice} /></div>
      </div>
      {priceInvalid ? <p className="cr-msg cr-msg--e" role="alert">Max price must be higher than min price.</p> : null}
      <span className="cr-label">Location</span>
      <button className="cr-input cr-input--button" onClick={onOpenLocation} type="button"><Icon name="pin" /><span>{draft.school || 'All campuses'}</span><Icon name="chv" /></button>
      <span className="cr-label">Condition</span>
      <div className="cr-chips" role="group" aria-label="Condition">
        {CONDITION_OPTIONS.map((option) => {
          const on = draft.conditions.includes(option.id);
          return (
            <button aria-pressed={on} className={on ? 'cr-chip on' : 'cr-chip'} key={option.id} onClick={() => setDraft({ ...draft, conditions: on ? draft.conditions.filter((item) => item !== option.id) : [...draft.conditions, option.id] })} type="button">{option.label}</button>
          );
        })}
      </div>
      <div className="cr-acts">
        <button className="cr-pbtn cr-pbtn--l" disabled={priceInvalid} onClick={() => onApply({ sort: draft.sort, category: draft.category, minPrice: draft.minPrice, maxPrice: draft.maxPrice, conditions: draft.conditions })} type="button">Show results</button>
      </div>
    </BottomSheet>
  );
}

type FiltersProps = Parameters<typeof FiltersSheetBody>[0];
/** Mounted only while open, so the draft starts from the current query every time. */
function FiltersSheet(props: FiltersProps) {
  return props.open ? <FiltersSheetBody {...props} /> : null;
}

/** Mockup 30: pick the campus to browse. */
function LocationSheetBody({ open, selected, onClose, onSelect }: { open: boolean; selected: string; onClose: () => void; onSelect: (school: string) => void }) {
  const [search, setSearch] = useState('');
  const matches = useMemo(() => {
    const value = search.trim().toLowerCase();
    return (value ? institutions.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(value)) : institutions).slice(0, 40);
  }, [search]);

  return (
    <BottomSheet full onClose={onClose} open={open} showClose title="Location">
      <div className="cr-sch">
        <Icon name="srch" />
        <input aria-label="Search campuses" onChange={(event) => setSearch(event.target.value)} placeholder="Search campus or city" type="search" value={search} />
      </div>
      <button className={selected === '' ? 'cr-row-btn is-selected' : 'cr-row-btn'} onClick={() => onSelect('')} type="button">
        <Icon name="pin" /><span className="cr-row-btn__main"><span className="cr-row-btn__title">All campuses</span></span>
        {selected === '' ? <Icon name="chk" /> : null}
      </button>
      {matches.map((item) => (
        <button className={selected === item.name ? 'cr-row-btn is-selected' : 'cr-row-btn'} key={item.id} onClick={() => onSelect(item.name)} type="button">
          <Icon name="pin" />
          <span className="cr-row-btn__main"><span className="cr-row-btn__title">{item.name}</span><span className="cr-row-btn__sub">{item.location}</span></span>
          {selected === item.name ? <Icon name="chk" /> : null}
        </button>
      ))}
      {matches.length === 0 ? <p className="cr-empty-line">No campuses match “{search.trim()}”.</p> : null}
    </BottomSheet>
  );
}

type LocationProps = Parameters<typeof LocationSheetBody>[0];
function LocationSheet(props: LocationProps) {
  return props.open ? <LocationSheetBody {...props} /> : null;
}
