import { Suspense } from 'react';
import type { Metadata } from 'next';
import { excerpt, loadPostPreview } from '@/lib/post-preview';
import { AnonymousFeed } from '@/features/anonymous/AnonymousFeed';
import { AppShell, BootScreen } from '@/features/app/AppShell';

/** The title and description a shared link shows: the post's own words. The picture comes from opengraph-image.tsx next to this file. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await loadPostPreview(id);
  if (!post) return { title: 'Anonymous · Common Room' };
  const words = excerpt(post.body, 160);
  return {
    title: `${excerpt(post.body, 60)} · Common Room`,
    description: words,
    openGraph: { title: 'Anonymous on Common Room', description: words, type: 'article' },
    twitter: { card: 'summary_large_image', title: 'Anonymous on Common Room', description: words },
  };
}

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
