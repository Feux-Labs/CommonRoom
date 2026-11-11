import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { AdvertiseScreen } from '@/features/ads/AdvertiseScreen';

export const metadata: Metadata = { title: 'Advertise · Common Room' };

export default function AdvertisePage() {
  return (
    <AppShell active={null}>
      <AdvertiseScreen />
    </AppShell>
  );
}
