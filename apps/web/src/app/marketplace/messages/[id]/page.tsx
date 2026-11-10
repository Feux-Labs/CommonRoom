import { Suspense } from 'react';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { MarketThreadScreen } from '@/features/market/MarketChat';

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketThreadScreen id={id} />;
}

export default function MarketThreadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Market">
      <Suspense fallback={<BootScreen label="Opening conversation" />}>
        <Thread params={params} />
      </Suspense>
    </AppShell>
  );
}
