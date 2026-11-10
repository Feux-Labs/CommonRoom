import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { SellRoute } from '@/features/market/SellRoute';

export const metadata: Metadata = { title: 'Sell an item · Common Room' };

export default function SellPage() {
  return (
    <AppShell active="Market" hideNav>
      <SellRoute />
    </AppShell>
  );
}
