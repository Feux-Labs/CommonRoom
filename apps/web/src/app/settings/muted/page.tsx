import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { SafetyListScreen } from '@/features/safety/SafetyListScreen';

export const metadata: Metadata = { title: 'Muted accounts · Common Room', robots: { index: false, follow: false } };

export default function MutedPage() {
  return (
    <AppShell active="Me">
      <SafetyListScreen kind="mutes" />
    </AppShell>
  );
}
