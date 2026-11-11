import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { HelpScreen } from '@/features/help/HelpScreen';

export const metadata: Metadata = { title: 'Help · Common Room' };

export default function HelpPage() {
  return (
    <AppShell active={null}>
      <HelpScreen />
    </AppShell>
  );
}
