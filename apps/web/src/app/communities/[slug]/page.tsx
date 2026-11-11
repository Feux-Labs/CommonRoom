import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { CommunityPage } from '@/features/communities/CommunityPage';

export const metadata: Metadata = { title: 'Community · Common Room' };

async function Community({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CommunityPage slug={slug} />;
}

export default function CommunityRoute({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <AppShell active={null}>
      <Suspense fallback={<BootScreen label="Opening community" />}>
        <Community params={params} />
      </Suspense>
    </AppShell>
  );
}
