import { Suspense } from 'react';
import { AnonymousThread } from '@/features/anonymous/AnonymousInbox';
import { AppShell, BootScreen } from '@/features/app/AppShell';

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnonymousThread threadId={id} />;
}

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active="Anonymous" hideNav>
      <Suspense fallback={<BootScreen label="Opening conversation" />}>
        <Thread params={params} />
      </Suspense>
    </AppShell>
  );
}
