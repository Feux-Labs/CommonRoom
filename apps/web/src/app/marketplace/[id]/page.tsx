import { Suspense } from 'react';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { ListingDetail } from '@/features/market/ListingDetail';

async function Listing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Market">
      <Suspense fallback={<BootScreen label="Opening listing" />}>
        <Listing params={params} />
      </Suspense>
    </AppShell>
  );
}
