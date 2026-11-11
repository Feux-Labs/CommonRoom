import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { ProScreen } from '@/features/pro/ProScreen';

export const metadata: Metadata = { title: 'Pro · Common Room' };

export default function ProPage() {
  return (
    <AppShell active={null}>
      <ProScreen />
    </AppShell>
  );
}
