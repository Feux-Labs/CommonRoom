import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { CommunitiesScreen } from '@/features/communities/CommunitiesScreen';

export const metadata: Metadata = { title: 'Communities · Common Room' };

export default function CommunitiesPage() {
  return (
    <AppShell active={null}>
      <CommunitiesScreen />
    </AppShell>
  );
}
