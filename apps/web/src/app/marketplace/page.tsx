import { MarketplaceExperience } from '@/components/MarketplaceExperience';
import { AppRouteShell } from '@/components/cr/AppRouteShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus Marketplace | Commonroom',
  description: 'Buy and sell textbooks, electronics, hostel gear, and campus essentials safely within your student community.',
};

export default function MarketplacePage() {
  return (
    <AppRouteShell active="Market">
      <MarketplaceExperience />
    </AppRouteShell>
  );
}
