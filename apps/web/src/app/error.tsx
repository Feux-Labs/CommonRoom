'use client';

import Link from 'next/link';
import { StateBlock } from '@/components/cr/FeedStates';

/** Shown when something unexpected breaks a page. The details stay in the server log, never on screen. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="cr-screen">
      <StateBlock
        actions={(
          <>
            <button className="cr-pbtn cr-pbtn--l" onClick={reset} type="button">Try again</button>
            <Link className="cr-ghost cr-ghost--l" href="/anonymous">Back to Common Room</Link>
          </>
        )}
        description="Something went wrong on our side. Please try again."
        icon="warn"
        role="alert"
        title="This page didn’t load"
      />
    </main>
  );
}
