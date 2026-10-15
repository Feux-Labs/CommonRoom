'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Coffee,
  Compass,
  Copy,
  Edit3,
  Eye,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  ImagePlus,
  Laptop,
  LayoutGrid,
  MapPin,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';
import Image from 'next/image';
import {
  MARKETPLACE_CATEGORIES,
  type CreateListingInput,
  type ListingCondition,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@/lib/marketplace-contracts';
import { INITIAL_MARKETPLACE_LISTINGS } from '@/lib/marketplace-seed';

type MarketplaceTab = 'explore' | 'saved' | 'my_listings';
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';

function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function getCategoryIcon(cat: MarketplaceCategory | 'all') {
  switch (cat) {
    case 'textbooks':
      return BookOpen;
    case 'electronics':
      return Laptop;
    case 'hostel':
      return HomeIcon;
    case 'fashion':
      return Shirt;
    case 'services':
      return Briefcase;
    case 'food':
      return Coffee;
    case 'other':
      return Tag;
    default:
      return LayoutGrid;
  }
}

export function MarketplaceExperience({ initialListingId }: { initialListingId?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<MarketplaceTab>('explore');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Listings data
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Selected Listing Modal (Details)
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Create / Edit Modal
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState<MarketplaceCategory>('electronics');
  const [formCondition, setFormCondition] = useState<ListingCondition>('like_new');
  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingListingId, setReportingListingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Scam or fraud attempt');
  const [reportDetails, setReportDetails] = useState('');

  // Contact / Purchase Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Seller Profile Modal
  const [sellerProfileListing, setSellerProfileListing] = useState<MarketplaceListing | null>(null);

  // Check Supabase session
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch listings
  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (sortOption) params.set('sort', sortOption);
      if (tab !== 'explore') params.set('tab', tab);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/v1/marketplace/listings?${params.toString()}`, { headers });
      const json = await res.json().catch(() => null);

      if (res.ok && json && json.data) {
        setListings(json.data);
      } else {
        // Fallback to initial seeds filtered locally
        let fallback = [...INITIAL_MARKETPLACE_LISTINGS];
        if (selectedCategory !== 'all') fallback = fallback.filter((i) => i.category === selectedCategory);
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          fallback = fallback.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
        }
        setListings(fallback);
      }
    } catch {
      setListings([...INITIAL_MARKETPLACE_LISTINGS]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, sortOption, tab, minPrice, maxPrice, session]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  // Open initial listing if provided via URL
  useEffect(() => {
    if (initialListingId && listings.length > 0) {
      const found = listings.find((item) => item.id === initialListingId);
      if (found) {
        setSelectedListing(found);
        setActiveImageIndex(0);
      }
    }
  }, [initialListingId, listings]);

  // Save / Toggle Favorite
  const toggleSave = async (listing: MarketplaceListing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextSaved = !listing.is_saved;

    setListings((current) =>
      current.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              is_saved: nextSaved,
              likes_count: Math.max(0, item.likes_count + (nextSaved ? 1 : -1)),
            }
          : item
      )
    );

    if (selectedListing?.id === listing.id) {
      setSelectedListing((curr) =>
        curr
          ? {
              ...curr,
              is_saved: nextSaved,
              likes_count: Math.max(0, curr.likes_count + (nextSaved ? 1 : -1)),
            }
          : null
      );
    }

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      await fetch(`/api/v1/marketplace/listings/${listing.id}/save`, {
        method: 'POST',
        headers,
      });
      setNotice(nextSaved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    } catch {
      // Local optimistic update stays
    }
  };

  // Open Create Composer
  const openCreateComposer = () => {
    setEditingListing(null);
    setFormTitle('');
    setFormDescription('');
    setFormPrice('');
    setFormCategory('electronics');
    setFormCondition('like_new');
    setFormLocation('Main Library / Hostel');
    setFormPhone('');
    setFormImageUrl('');
    setFormImages([
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
    ]);
    setComposerOpen(true);
  };

  // Open Edit Composer
  const openEditComposer = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setFormTitle(listing.title);
    setFormDescription(listing.description);
    setFormPrice(listing.price.toString());
    setFormCategory(listing.category);
    setFormCondition(listing.condition);
    setFormLocation(listing.location);
    setFormPhone(listing.seller_phone || '');
    setFormImageUrl('');
    setFormImages(listing.images);
    setComposerOpen(true);
  };

  // Add Image URL to form
  const handleAddImage = () => {
    if (!formImageUrl.trim()) return;
    if (formImages.length >= 6) {
      setError('You can add up to 6 images per listing.');
      return;
    }
    setFormImages((current) => [...current, formImageUrl.trim()]);
    setFormImageUrl('');
  };

  // Remove image from form
  const handleRemoveImage = (index: number) => {
    setFormImages((current) => current.filter((_, i) => i !== index));
  };

  // Submit Listing (Create or Update)
  const handleSubmitListing = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price in Naira (₦).');
      return;
    }
    if (formTitle.trim().length < 3) {
      setError('Please give your listing a title of at least 3 characters.');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateListingInput = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      price: priceNum,
      category: formCategory,
      condition: formCondition,
      location: formLocation.trim() || 'Local',
      contact_phone: formPhone.trim() || undefined,
      images:
        formImages.length > 0
          ? formImages
          : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80'],
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      if (editingListing) {
        const res = await fetch(`/api/v1/marketplace/listings/${editingListing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Could not update listing.');

        setListings((current) =>
          current.map((item) => (item.id === editingListing.id ? { ...item, ...payload } : item))
        );
        if (selectedListing?.id === editingListing.id) {
          setSelectedListing((curr) => (curr ? { ...curr, ...payload } : null));
        }
        setNotice('Your listing has been updated!');
      } else {
        const res = await fetch('/api/v1/marketplace/listings', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Could not publish listing.');

        const created = json.data as MarketplaceListing;
        setListings((current) => [created, ...current]);
        setNotice('Your listing is live on the marketplace!');
      }

      setComposerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Sold Status
  const toggleSoldStatus = async (listing: MarketplaceListing) => {
    const nextStatus = listing.status === 'sold' ? 'available' : 'sold';
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      await fetch(`/api/v1/marketplace/listings/${listing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus }),
      });

      setListings((current) =>
        current.map((item) => (item.id === listing.id ? { ...item, status: nextStatus } : item))
      );
      if (selectedListing?.id === listing.id) {
        setSelectedListing((curr) => (curr ? { ...curr, status: nextStatus } : null));
      }
      setNotice(nextStatus === 'sold' ? 'Item marked as Sold!' : 'Item marked as Available!');
    } catch {
      setError('Could not update listing status.');
    }
  };

  // Delete Listing
  const deleteListing = async (listing: MarketplaceListing) => {
    if (!window.confirm(`Are you sure you want to delete "${listing.title}"?`)) return;

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      await fetch(`/api/v1/marketplace/listings/${listing.id}`, {
        method: 'DELETE',
        headers,
      });

      setListings((current) => current.filter((item) => item.id !== listing.id));
      if (selectedListing?.id === listing.id) {
        setSelectedListing(null);
      }
      setNotice('Listing deleted.');
    } catch {
      setError('Could not delete listing.');
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportingListingId) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      await fetch(`/api/v1/marketplace/listings/${reportingListingId}/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });

      setReportModalOpen(false);
      setReportingListingId(null);
      setNotice('Thank you. Commonroom moderators will review this listing to keep students safe.');
    } catch {
      setError('Could not submit report. Please try again.');
    }
  };

  // Share Listing
  const shareListing = (listing: MarketplaceListing) => {
    const url = `${window.location.origin}/marketplace/${listing.id}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${listing.title} - ${formatNaira(listing.price)}\n${url}`);
      setNotice('Listing link copied to clipboard!');
    } else {
      window.prompt('Copy this listing link:', url);
    }
  };

  return (
    <main className="market-shell">
      <div className="market-wrap">
        {/* Header matching Mobile Marketplace design (Screenshot 1) */}
        <header className="market-header">
          <div className="market-header-left">
            <ShoppingCart size={22} strokeWidth={2.4} />
            <span className="market-header-divider" />
            <h1 className="market-header-title">Marketplace</h1>
          </div>
          <div className="market-header-actions">
            <button
              className={`market-icon-btn ${showSearch ? 'market-icon-btn-active' : ''}`}
              onClick={() => setShowSearch((prev) => !prev)}
              aria-label="Search items"
              type="button"
            >
              <Search size={18} />
            </button>
            <button
              className={`market-icon-btn ${showPriceFilter || minPrice || maxPrice ? 'market-icon-btn-active' : ''}`}
              onClick={() => setShowPriceFilter((prev) => !prev)}
              aria-label="Filter items"
              type="button"
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              className="market-sell-pill-btn"
              onClick={openCreateComposer}
              type="button"
            >
              <Plus size={15} strokeWidth={2.8} />
              <span>Sell</span>
            </button>
          </div>
        </header>

        {showSearch ? (
          <div className="market-search-dropdown">
            <Search size={16} className="market-search-icon" />
            <input
              type="text"
              autoFocus
              placeholder="Search textbooks, electronics, gear…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search marketplace"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="market-search-clear" type="button">
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        {showPriceFilter ? (
          <div className="market-price-filter-row">
            <span className="market-filter-label">Price (₦):</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="market-price-input"
            />
            <span className="market-dash">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="market-price-input"
            />
            {minPrice || maxPrice ? (
              <button
                type="button"
                className="market-reset-filter-btn"
                onClick={() => { setMinPrice(''); setMaxPrice(''); }}
              >
                Reset
              </button>
            ) : null}
            <select
              aria-label="Sort listings"
              className="market-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        ) : null}

        {/* Global Notifications */}
        {error ? (
          <div className="market-feedback market-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        ) : null}
        {notice ? (
          <div className="market-feedback market-notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Dismiss notice">
              <X size={15} />
            </button>
          </div>
        ) : null}

        {/* Main Navigation Tabs */}
        <nav aria-label="Marketplace views" className="market-tabs">
          <button
            aria-current={tab === 'explore' ? 'page' : undefined}
            className={tab === 'explore' ? 'market-tab market-tab-active' : 'market-tab'}
            onClick={() => setTab('explore')}
          >
            <Compass size={15} /> <span>Explore</span>
          </button>
          <button
            aria-current={tab === 'saved' ? 'page' : undefined}
            className={tab === 'saved' ? 'market-tab market-tab-active' : 'market-tab'}
            onClick={() => setTab('saved')}
          >
            <Bookmark size={15} /> <span>Saved</span>
          </button>
          <button
            aria-current={tab === 'my_listings' ? 'page' : undefined}
            className={tab === 'my_listings' ? 'market-tab market-tab-active' : 'market-tab'}
            onClick={() => setTab('my_listings')}
          >
            <Tag size={15} /> <span>My Listings</span>
          </button>
        </nav>

        {/* Category Pills Carousel (Text only matching Screenshot 2) */}
        <div className="market-categories-scroller">
          <div className="market-categories-track" role="tablist" aria-label="Marketplace categories">
            {MARKETPLACE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const label = cat.id === 'textbooks' ? 'Textbooks' : cat.label;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  className={`market-category-pill ${isActive ? 'market-category-pill-active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="market-loading-state">
            <div className="market-spinner" />
            <p>Finding listings near you…</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="market-empty-state">
            <div className="market-empty-icon">
              <ShoppingCart size={38} />
            </div>
            <h3>No items listed right now</h3>
            <p>
              {tab === 'saved'
                ? 'You have not saved any items to your wishlist yet. Tap the heart on any item you love.'
                : tab === 'my_listings'
                ? 'You have not listed anything yet. Declutter your room or offer a skill!'
                : 'No items match your selected filters. Try broadening your search or be the first to post!'}
            </p>
            {tab !== 'saved' ? (
              <button className="market-button-primary" onClick={openCreateComposer}>
                <Plus size={16} /> Post First Listing
              </button>
            ) : null}
          </div>
        ) : (
          <div className="market-grid">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className={`market-card ${listing.status === 'sold' ? 'market-card-sold' : ''}`}
                onClick={() => {
                  setSelectedListing(listing);
                  setActiveImageIndex(0);
                }}
              >
                {/* Image Cover */}
                <div className="market-card-media">
                  <img
                    src={listing.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                    alt={listing.title}
                    loading="lazy"
                  />
                  {/* Status Badges */}
                  <div className="market-badges-top">
                    {listing.status === 'sold' ? (
                      <span className="market-status-badge market-status-sold">Sold</span>
                    ) : listing.status === 'reserved' ? (
                      <span className="market-status-badge market-status-reserved">Reserved</span>
                    ) : (
                      <span className="market-status-badge market-status-available">
                        {listing.condition === 'new'
                          ? 'Brand New'
                          : listing.condition === 'like_new'
                          ? 'Like New'
                          : 'Pre-owned'}
                      </span>
                    )}
                  </div>

                  {/* Favorite Button */}
                  <button
                    className={`market-card-heart ${listing.is_saved ? 'market-card-heart-active' : ''}`}
                    onClick={(e) => toggleSave(listing, e)}
                    aria-label="Save listing"
                  >
                    <Heart size={16} fill={listing.is_saved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Content with clean non-overlapping hierarchy */}
                <div className="market-card-body">
                  <div className="market-card-top-row">
                    <span className="market-card-category">{listing.category}</span>
                    <span className="market-card-time">{relativeTime(listing.created_at)}</span>
                  </div>

                  <div className="market-card-price">{formatNaira(listing.price)}</div>

                  <h3 className="market-card-title">{listing.title}</h3>

                  <div className="market-card-location-row">
                    <MapPin size={12} className="market-location-pin" />
                    <span className="market-card-location-text" title={listing.location}>{listing.location}</span>
                  </div>

                  <div className="market-card-footer">
                    <button
                      type="button"
                      className="market-card-seller-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSellerProfileListing(listing);
                      }}
                      title={`View ${listing.seller_name}'s profile`}
                    >
                      <span className="market-seller-avatar-mini">
                        {listing.seller_avatar ? (
                          <img src={listing.seller_avatar} alt="" />
                        ) : (
                          listing.seller_name.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span className="market-card-seller-name">
                        @{listing.seller_username || listing.seller_name.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                    </button>
                    {listing.views_count > 0 ? (
                      <span className="market-card-views">
                        <Eye size={12} /> {listing.views_count}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Detailed Item Modal */}
        {selectedListing ? (
          <div className="market-modal-backdrop" onClick={() => setSelectedListing(null)}>
            <div
              className="market-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Listing details"
            >
              <div className="market-modal-top">
                <span className="market-modal-badge">{selectedListing.category.toUpperCase()}</span>
                <button
                  className="market-modal-close"
                  onClick={() => setSelectedListing(null)}
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Multi-image gallery */}
              <div className="market-gallery">
                <div className="market-gallery-hero">
                  <img
                    src={selectedListing.images[activeImageIndex] || selectedListing.images[0]}
                    alt={selectedListing.title}
                  />
                  {selectedListing.status === 'sold' ? (
                    <div className="market-sold-banner">SOLD OUT</div>
                  ) : null}
                </div>
                {selectedListing.images.length > 1 ? (
                  <div className="market-gallery-thumbnails">
                    {selectedListing.images.map((img, idx) => (
                      <button
                        key={idx}
                        className={`market-thumb ${idx === activeImageIndex ? 'market-thumb-active' : ''}`}
                        onClick={() => setActiveImageIndex(idx)}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Title & Price Header */}
              <div className="market-detail-header">
                <div>
                  <h2 className="market-detail-title">{selectedListing.title}</h2>
                  <div className="market-detail-location-row">
                    <MapPin size={15} />
                    <span>{selectedListing.location}</span>
                    {selectedListing.school ? <span>· {selectedListing.school}</span> : null}
                    <span>· {relativeTime(selectedListing.created_at)}</span>
                  </div>
                </div>
                <div className="market-detail-price-box">
                  <span className="market-detail-price">{formatNaira(selectedListing.price)}</span>
                  <span className="market-condition-chip">
                    Condition: {selectedListing.condition.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="market-detail-section">
                <h4>Description</h4>
                <p className="market-detail-description">{selectedListing.description}</p>
              </div>

              {/* Seller Information with school and profile action */}
              <div className="market-seller-card">
                <div
                  className="market-seller-avatar market-avatar-clickable"
                  onClick={() => setSellerProfileListing(selectedListing)}
                  title="View seller profile"
                >
                  {selectedListing.seller_avatar ? (
                    <img src={selectedListing.seller_avatar} alt={selectedListing.seller_name} />
                  ) : (
                    <span>{selectedListing.seller_name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div
                  className="market-seller-info market-info-clickable"
                  onClick={() => setSellerProfileListing(selectedListing)}
                  title="View seller profile"
                >
                  <strong>{selectedListing.seller_name}</strong>
                  <span>@{selectedListing.seller_username || 'seller'}</span>
                  <small>
                    <GraduationCap size={13} className="market-school-icon" />
                    {selectedListing.seller_school || selectedListing.school || 'Verified Student (No school listed)'}
                  </small>
                </div>
                <div className="market-seller-card-buttons">
                  <button
                    type="button"
                    className="market-btn-view-profile"
                    onClick={() => setSellerProfileListing(selectedListing)}
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    className="market-contact-btn"
                    onClick={() => setContactModalOpen(true)}
                    disabled={selectedListing.status === 'sold'}
                  >
                    <Phone size={15} /> Contact
                  </button>
                </div>
              </div>

              {/* Action Buttons for Buyer or Seller */}
              <div className="market-modal-actions">
                <button
                  className={`market-btn-secondary ${selectedListing.is_saved ? 'market-btn-saved' : ''}`}
                  onClick={() => void toggleSave(selectedListing)}
                >
                  <Heart size={16} fill={selectedListing.is_saved ? 'currentColor' : 'none'} />
                  {selectedListing.is_saved ? 'Saved' : 'Save'} ({selectedListing.likes_count})
                </button>
                <button className="market-btn-secondary" onClick={() => shareListing(selectedListing)}>
                  <Share2 size={16} /> Share
                </button>
                <button
                  className="market-btn-report"
                  onClick={() => {
                    setReportingListingId(selectedListing.id);
                    setReportModalOpen(true);
                  }}
                >
                  <AlertTriangle size={16} /> Report
                </button>

                {/* Seller controls */}
                {selectedListing.is_mine ? (
                  <div className="market-seller-actions">
                    <button
                      className="market-btn-toggle-sold"
                      onClick={() => void toggleSoldStatus(selectedListing)}
                    >
                      {selectedListing.status === 'sold' ? 'Mark Available' : 'Mark as Sold'}
                    </button>
                    <button
                      className="market-btn-edit"
                      onClick={() => {
                        openEditComposer(selectedListing);
                        setSelectedListing(null);
                      }}
                    >
                      <Edit3 size={15} /> Edit
                    </button>
                    <button
                      className="market-btn-delete"
                      onClick={() => void deleteListing(selectedListing)}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Contact Seller Modal */}
        {contactModalOpen && selectedListing ? (
          <div className="market-modal-backdrop" onClick={() => setContactModalOpen(false)}>
            <div className="market-contact-modal" onClick={(e) => e.stopPropagation()}>
              <div className="market-modal-top">
                <h3>Contact {selectedListing.seller_name}</h3>
                <button className="market-modal-close" onClick={() => setContactModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <p className="market-contact-intro">
                Reach out to arrange a safe in-person inspection and handoff.
              </p>

              <div className="market-contact-details">
                <div className="market-contact-row">
                  <Phone size={18} />
                  <div>
                    <strong>Phone / WhatsApp</strong>
                    <span>{selectedListing.seller_phone || '0803 000 1234'}</span>
                  </div>
                  <a
                    className="market-call-link"
                    href={`tel:${selectedListing.seller_phone || '08030001234'}`}
                  >
                    Call
                  </a>
                  <a
                    className="market-wa-link"
                    href={`https://wa.me/234${(selectedListing.seller_phone || '8030001234').replace(/^0/, '')}?text=${encodeURIComponent(`Hi, I'm interested in your listing on Marketplace: ${selectedListing.title}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>

              <div className="market-safety-reminder">
                <ShieldCheck size={16} />
                <span>
                  Never make direct bank transfers until you hold the item in your hands in a safe public place!
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Create / Edit Listing Modal */}
        {composerOpen ? (
          <div className="market-modal-backdrop" onClick={() => setComposerOpen(false)}>
            <div
              className="market-composer-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create marketplace listing"
            >
              <div className="market-modal-top">
                <h3>{editingListing ? 'Edit Your Listing' : 'List an Item'}</h3>
                <button className="market-modal-close" onClick={() => setComposerOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form className="market-form" onSubmit={(e) => void handleSubmitListing(e)}>
                <label className="market-form-field">
                  <span>Item Title *</span>
                  <input
                    required
                    type="text"
                    maxLength={140}
                    placeholder="e.g. MacBook Air M1, Netter Anatomy, Standing Fan..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </label>

                <div className="market-form-row">
                  <label className="market-form-field">
                    <span>Price (₦ Naira) *</span>
                    <input
                      required
                      type="number"
                      min={0}
                      placeholder="e.g. 25000"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </label>

                  <label className="market-form-field">
                    <span>Category *</span>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as MarketplaceCategory)}
                    >
                      {MARKETPLACE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="market-form-row">
                  <label className="market-form-field">
                    <span>Condition *</span>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as ListingCondition)}
                    >
                      <option value="new">Brand New</option>
                      <option value="like_new">Like New / Mint</option>
                      <option value="good">Good / Minor Wear</option>
                      <option value="fair">Fair / Functional</option>
                    </select>
                  </label>

                  <label className="market-form-field">
                    <span>Location / Meetup Area *</span>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Moremi Hall, Yaba, Ikeja, Main Gate, SUB..."
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                    />
                  </label>
                </div>

                <label className="market-form-field">
                  <span>Contact Phone / WhatsApp</span>
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </label>

                <label className="market-form-field">
                  <span>Item Photos (URL or preset)</span>
                  <div className="market-image-add-row">
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                    />
                    <button type="button" onClick={handleAddImage} className="market-add-img-btn">
                      <ImagePlus size={15} /> Add
                    </button>
                  </div>
                  {/* Photo previews */}
                  <div className="market-form-previews">
                    {formImages.map((img, i) => (
                      <div key={i} className="market-preview-item">
                        <img src={img} alt={`Preview ${i}`} />
                        <button type="button" onClick={() => handleRemoveImage(i)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </label>

                <label className="market-form-field">
                  <span>Description *</span>
                  <textarea
                    required
                    rows={4}
                    maxLength={3000}
                    placeholder="Describe condition, specifications, reasons for selling, and where to meet..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </label>

                <div className="market-form-actions">
                  <button
                    type="button"
                    className="market-btn-cancel"
                    onClick={() => setComposerOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="market-button-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Publishing…' : editingListing ? 'Save Changes' : 'Publish Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Safety Report Modal */}
        {reportModalOpen ? (
          <div className="market-modal-backdrop" onClick={() => setReportModalOpen(false)}>
            <div className="market-report-modal" onClick={(e) => e.stopPropagation()}>
              <div className="market-modal-top">
                <h3>Report Listing</h3>
                <button className="market-modal-close" onClick={() => setReportModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={(e) => void handleSubmitReport(e)} className="market-form">
                <label className="market-form-field">
                  <span>Reason for reporting</span>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="Scam or fraud attempt">Scam or fraud attempt</option>
                    <option value="Counterfeit or fake item">Counterfeit or fake item</option>
                    <option value="Prohibited or dangerous goods">Prohibited or dangerous goods</option>
                    <option value="Misleading price or description">Misleading price or description</option>
                    <option value="Inappropriate or offensive content">Inappropriate or offensive content</option>
                  </select>
                </label>
                <label className="market-form-field">
                  <span>Additional details (optional)</span>
                  <textarea
                    rows={3}
                    placeholder="Provide any additional context for moderators..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                  />
                </label>
                <div className="market-form-actions">
                  <button
                    type="button"
                    className="market-btn-cancel"
                    onClick={() => setReportModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="market-btn-report-submit">
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Seller Profile Modal */}
        {sellerProfileListing ? (
          <div className="market-modal-backdrop" onClick={() => setSellerProfileListing(null)}>
            <div className="market-seller-profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="market-modal-top">
                <span className="market-modal-badge">SELLER PROFILE</span>
                <button className="market-modal-close" onClick={() => setSellerProfileListing(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="market-seller-profile-header">
                <div className="market-seller-profile-avatar">
                  {sellerProfileListing.seller_avatar ? (
                    <img src={sellerProfileListing.seller_avatar} alt={sellerProfileListing.seller_name} />
                  ) : (
                    <span>{sellerProfileListing.seller_name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="market-seller-profile-names">
                  <h3>{sellerProfileListing.seller_name}</h3>
                  <span className="market-seller-profile-handle">
                    @{sellerProfileListing.seller_username || 'seller'}
                  </span>
                  <span className="market-verified-badge">
                    <CheckCircle2 size={13} /> Verified Student
                  </span>
                </div>
              </div>

              <div className="market-seller-facts">
                <div className="market-seller-fact-card">
                  <span className="market-fact-label">School / Institution</span>
                  <div className="market-fact-value">
                    <GraduationCap size={16} />
                    <span>{sellerProfileListing.seller_school || sellerProfileListing.school || 'No school specified'}</span>
                  </div>
                </div>

                <div className="market-seller-fact-card">
                  <span className="market-fact-label">Meetup Area</span>
                  <div className="market-fact-value">
                    <MapPin size={16} />
                    <span>{sellerProfileListing.location}</span>
                  </div>
                </div>
              </div>

              {/* Items listed by this seller */}
              <div className="market-seller-catalog-section">
                <h4>Items by {sellerProfileListing.seller_name}</h4>
                <div className="market-seller-catalog-list">
                  {listings
                    .filter((item) => item.seller_id === sellerProfileListing.seller_id)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="market-seller-catalog-item"
                        onClick={() => {
                          setSellerProfileListing(null);
                          setSelectedListing(item);
                          setActiveImageIndex(0);
                        }}
                      >
                        <img
                          src={item.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80'}
                          alt={item.title}
                        />
                        <div className="market-seller-catalog-info">
                          <strong>{item.title}</strong>
                          <span>{formatNaira(item.price)}</span>
                        </div>
                        <span className={`market-status-chip ${item.status === 'sold' ? 'sold' : 'available'}`}>
                          {item.status === 'sold' ? 'Sold' : 'Available'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="market-seller-profile-footer">
                <button
                  type="button"
                  className="market-button-primary"
                  onClick={() => {
                    setSelectedListing(sellerProfileListing);
                    setSellerProfileListing(null);
                    setContactModalOpen(true);
                  }}
                >
                  <Phone size={15} /> Contact Seller
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile Floating Action Button for selling */}
        <button
          className="market-floating-sell-fab"
          onClick={openCreateComposer}
          aria-label="Sell an item"
          type="button"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Sell</span>
        </button>
      </div>
    </main>
  );
}
