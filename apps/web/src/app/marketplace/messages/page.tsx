import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { MarketInbox } from '@/features/market/MarketChat';

export const metadata: Metadata = { title: 'Messages · Common Room', robots: { index: false, follow: false } };

export default function MarketMessagesPage() {
  return (
    <AppShell active="Market">
      <MarketInbox />
    </AppShell>
  );
}
