import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicMessagePage } from '@/features/anonymous/PublicMessagePage';
import { BootScreen } from '@/features/app/AppShell';

export const metadata: Metadata = {
  title: 'Send an anonymous message · Common Room',
  robots: { index: false, follow: false },
};

async function PublicLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicMessagePage token={token} />;
}

export default function PublicLinkPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<BootScreen label="Opening link" />}>
      <PublicLink params={params} />
    </Suspense>
  );
}
