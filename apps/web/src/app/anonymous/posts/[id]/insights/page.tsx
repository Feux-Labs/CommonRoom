import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PostInsightsPage } from '@/features/anonymous/PostInsightsPage';
import { AppShell, BootScreen } from '@/features/app/AppShell';

export const metadata: Metadata = { title: 'Post insights · Common Room' };

async function Insights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostInsightsPage kind="anonymous" postId={id} />;
}

export default function InsightsRoute({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Anonymous" hideNav>
      <Suspense fallback={<BootScreen label="Opening insights" />}>
        <Insights params={params} />
      </Suspense>
    </AppShell>
  );
}
