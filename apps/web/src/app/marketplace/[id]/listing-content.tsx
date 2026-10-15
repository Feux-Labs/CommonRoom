'use client';

import { useParams } from 'next/navigation';
import { MarketplaceExperience } from '@/components/MarketplaceExperience';

export default function ListingContent() {
  const params = useParams<{ id: string }>();
  return <MarketplaceExperience initialListingId={params.id} />;
}
