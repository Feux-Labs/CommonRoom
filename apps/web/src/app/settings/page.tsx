import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { SettingsScreen } from '@/features/profile/SettingsScreen';

export const metadata: Metadata = { title: 'Settings · Common Room' };

export default function SettingsPage() {
  return (
    <AppShell active="Me">
      <SettingsScreen />
    </AppShell>
  );
}
