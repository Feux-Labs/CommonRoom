import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';

export const metadata: Metadata = { title: 'Notifications · Common Room' };

export default function NotificationsPage() {
  return (
    <AppShell active={null}>
      <NotificationsScreen />
    </AppShell>
  );
}
