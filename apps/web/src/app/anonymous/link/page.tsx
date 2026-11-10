import { AnonymousLinkSettings } from '@/features/anonymous/AnonymousInbox';
import { AppShell } from '@/features/app/AppShell';

export default function LinkSettingsPage() {
  return (
    <AppShell active="Anonymous">
      <AnonymousLinkSettings />
    </AppShell>
  );
}
