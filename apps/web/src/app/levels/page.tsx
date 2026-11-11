import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { LevelsScreen } from '@/features/pro/LevelsScreen';

export const metadata: Metadata = { title: 'Ranks · Common Room' };

export default function LevelsPage() {
  return (
    <AppShell active={null}>
      <LevelsScreen />
    </AppShell>
  );
}
