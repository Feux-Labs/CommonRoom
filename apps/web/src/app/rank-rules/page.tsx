import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { RankRulesScreen } from '@/features/pro/RankRulesScreen';

export const metadata: Metadata = { title: 'Rank rule book · Common Room' };

export default function RankRulesPage() {
  return (
    <AppShell active={null}>
      <RankRulesScreen />
    </AppShell>
  );
}
