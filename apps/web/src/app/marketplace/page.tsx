import { MarketplaceExperience } from '@/components/MarketplaceExperience';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus Marketplace | Commonroom',
  description: 'Buy and sell textbooks, electronics, hostel gear, and campus essentials safely within your student community.',
};

export default function MarketplacePage() {
  return <MarketplaceExperience />;
}
