import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AnonymousFeed } from '@/features/anonymous/AnonymousFeed';
import { AppShell, BootScreen } from '@/features/app/AppShell';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag).slice(0, 40)} · Common Room`, description: 'Anonymous posts with this tag.' };
}

async function TagFeed({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag);
  return /^[A-Za-z0-9_]{1,40}$/.test(clean) ? <AnonymousFeed tag={clean} /> : <AnonymousFeed />;
}

export default function AnonymousTagPage({ params }: { params: Promise<{ tag: string }> }) {
  return (
    <AppShell active="Anonymous">
      <Suspense fallback={<BootScreen label="Opening tag" />}>
        <TagFeed params={params} />
      </Suspense>
    </AppShell>
  );
}
