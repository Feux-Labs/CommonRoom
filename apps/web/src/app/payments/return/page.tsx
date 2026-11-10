import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentReturn } from '@/features/payments/PaymentReturn';

export const metadata: Metadata = { title: 'Payment · Common Room', robots: { index: false, follow: false } };

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
