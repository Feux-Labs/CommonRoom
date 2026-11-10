import { Suspense } from 'react';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { SellRoute } from '@/features/market/SellRoute';

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellRoute listingId={id} />;
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Market" hideNav>
      <Suspense fallback={<BootScreen label="Opening listing" />}>
        <Edit params={params} />
      </Suspense>
    </AppShell>
  );
}
