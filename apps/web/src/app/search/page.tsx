import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { SearchScreen } from '@/features/profile/SearchScreen';

export const metadata: Metadata = { title: 'Search · Common Room' };

export default function SearchPage() {
  return (
    <AppShell active={null}>
      <SearchScreen />
    </AppShell>
  );
}
