import { Suspense } from 'react';
import ListingContent from './listing-content';
import { AppRouteShell } from '@/components/cr/AppRouteShell';

export default function ListingPage() {
  return (
    <AppRouteShell active="Market">
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
    </AppRouteShell>
  );
}
