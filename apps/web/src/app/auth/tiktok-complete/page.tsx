import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TikTokComplete } from '@/features/auth/TikTokComplete';

export const metadata: Metadata = { title: 'Signing in · Common Room', robots: { index: false, follow: false } };

export default function TikTokCompletePage() {
  return (
    <Suspense fallback={null}>
      <TikTokComplete />
    </Suspense>
  );
}
