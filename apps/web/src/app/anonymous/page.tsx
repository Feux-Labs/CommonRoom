import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AnonymousFeed } from '@/features/anonymous/AnonymousFeed';
import { AnonymousFeedRoute } from '@/features/anonymous/AnonymousFeedRoute';
import { AppShell } from '@/features/app/AppShell';

export const metadata: Metadata = { title: 'Anonymous · Common Room' };

export default function AnonymousPage() {
  return (
    <AppShell active="Anonymous">
      <Suspense fallback={<AnonymousFeed />}>
        <AnonymousFeedRoute />
      </Suspense>
    </AppShell>
  );
}
