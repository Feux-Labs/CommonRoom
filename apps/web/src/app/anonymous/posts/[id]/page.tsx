import { Suspense } from 'react';
import { AnonymousFeed } from '@/features/anonymous/AnonymousFeed';
import { AppShell, BootScreen } from '@/features/app/AppShell';

async function AnonymousPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnonymousFeed focusPostId={id} />;
}

export default function AnonymousPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Anonymous">
      <Suspense fallback={<BootScreen label="Opening post" />}>
        <AnonymousPost params={params} />
      </Suspense>
    </AppShell>
  );
}
