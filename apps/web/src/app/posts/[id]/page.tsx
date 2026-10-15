import { Suspense } from 'react';
import Home from '../../page';

async function SharedPostContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Home key={id} />;
}

export default function SharedPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main aria-busy="true">Opening post…</main>}>
      <SharedPostContent params={params} />
    </Suspense>
  );
}
