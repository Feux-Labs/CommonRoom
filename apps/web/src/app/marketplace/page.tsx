import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { MarketBrowse } from '@/features/market/MarketBrowse';

export const metadata: Metadata = {
  title: 'Market · Common Room',
  description: 'Buy and sell textbooks, electronics, hostel gear and more with students on your campus.',
};

export default function MarketplacePage() {
  return (
    <AppShell active="Market">
      <MarketBrowse />
    </AppShell>
  );
}
