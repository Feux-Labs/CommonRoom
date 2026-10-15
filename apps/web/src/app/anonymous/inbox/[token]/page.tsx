import { Suspense } from 'react';
import { AnonymousExperience } from '@/components/AnonymousExperience';

async function InboxLinkContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AnonymousExperience initialInboxToken={token} />;
}

export default function AnonymousInboxLinkPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main aria-busy="true">Opening anonymous inbox…</main>}>
      <InboxLinkContent params={params} />
    </Suspense>
  );
}
