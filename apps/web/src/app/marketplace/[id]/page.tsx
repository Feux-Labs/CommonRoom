import { Suspense } from 'react';
import ListingContent from './listing-content';

export default function ListingPage() {
  return (
    <Suspense
      fallback={
        <main className="market-shell">
          <div className="market-wrap">
            <div className="market-loading-state">
              <div className="market-spinner" />
              <p>Loading listing…</p>
            </div>
          </div>
        </main>
      }
    >
      <ListingContent />
    </Suspense>
  );
}
