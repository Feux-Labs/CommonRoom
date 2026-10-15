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
  description: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryMeta[] = [
  { id: 'all', label: 'All Items', iconName: 'LayoutGrid', description: 'Everything campus' },
  { id: 'textbooks', label: 'Textbooks & Notes', iconName: 'BookOpen', description: 'Academic books, handouts, past questions' },
  { id: 'electronics', label: 'Tech & Gadgets', iconName: 'Laptop', description: 'Phones, laptops, powerbanks, chargers' },
  { id: 'hostel', label: 'Hostel Gear', iconName: 'Home', description: 'Refrigerators, mattresses, fans, reading lamps' },
  { id: 'fashion', label: 'Fashion & Thrift', iconName: 'Shirt', description: 'Clothes, sneakers, bags, accessories' },
  { id: 'services', label: 'Services & Skills', iconName: 'Briefcase', description: 'Tutoring, graphic design, tailoring, hair' },
  { id: 'food', label: 'Food & Snacks', iconName: 'Coffee', description: 'Campus treats, meal preps, provisions' },
  { id: 'other', label: 'Other', iconName: 'Tag', description: 'Miscellaneous student items' },
];

export type MarketplaceFilter = {
  search?: string;
  category?: MarketplaceCategory | 'all';
  school?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'popular';
  status?: ListingStatus | 'all';
  cursor?: string | null;
  limit?: number;
};

export type CreateListingInput = {
  title: string;
  description: string;
  price: number;
  category: MarketplaceCategory;
  condition?: ListingCondition;
  location: string;
  school?: string | null;
  images?: string[];
  contact_phone?: string;
};

export type UpdateListingInput = Partial<CreateListingInput> & {
  status?: ListingStatus;
};

export type ListingReportInput = {
  listing_id: string;
  reason: string;
  details?: string;
};
