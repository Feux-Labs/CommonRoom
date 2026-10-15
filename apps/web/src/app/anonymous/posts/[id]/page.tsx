import { Suspense } from 'react';
import { AnonymousExperience } from '@/components/AnonymousExperience';

async function AnonymousPostContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnonymousExperience initialPostId={id} />;
}

export default function AnonymousPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main aria-busy="true">Opening anonymous post…</main>}>
      <AnonymousPostContent params={params} />
    </Suspense>
  );
}
