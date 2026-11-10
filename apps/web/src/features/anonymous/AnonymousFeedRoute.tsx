'use client';

import { useSearchParams } from 'next/navigation';
import { AnonymousFeed } from './AnonymousFeed';

/** Reads ?posted=<id> (set after publishing) so the new post shows first. */
export function AnonymousFeedRoute() {
  const params = useSearchParams();
  return <AnonymousFeed pinPostId={params.get('posted')} />;
}
