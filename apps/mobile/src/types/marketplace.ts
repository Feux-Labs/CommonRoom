export type MarketplaceCategory =
  | 'textbooks'
  | 'electronics'
  | 'hostel'
  | 'fashion'
  | 'services'
  | 'food'
  | 'other';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ListingStatus = 'available' | 'sold' | 'reserved' | 'removed';

export type MarketplaceListing = {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_username: string | null;
  seller_avatar: string | null;
  seller_school: string | null;
  seller_phone: string | null;
  title: string;
  description: string;
  price: number;
  category: MarketplaceCategory;
  condition: ListingCondition;
  location: string;
  school: string | null;
  images: string[];
  status: ListingStatus;
  likes_count: number;
  views_count: number;
  is_saved: boolean;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplaceCategoryMeta = {
  id: MarketplaceCategory | 'all';
  label: string;
  iconName: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryMeta[] = [
  { id: 'all', label: 'All Items', iconName: 'Grid' },
  { id: 'textbooks', label: 'Textbooks', iconName: 'School' },
  { id: 'electronics', label: 'Tech & Gadgets', iconName: 'Image' },
  { id: 'hostel', label: 'Hostel Gear', iconName: 'Home' },
  { id: 'fashion', label: 'Fashion', iconName: 'Star' },
  { id: 'services', label: 'Services', iconName: 'Save' },
  { id: 'food', label: 'Food & Snacks', iconName: 'Heart' },
  { id: 'other', label: 'Other', iconName: 'Menu' },
];
