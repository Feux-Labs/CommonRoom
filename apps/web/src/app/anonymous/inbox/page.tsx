import type { Metadata } from 'next';
import { AnonymousInbox } from '@/features/anonymous/AnonymousInbox';
import { AppShell } from '@/features/app/AppShell';

export const metadata: Metadata = { title: 'Inbox · Common Room' };

export default function InboxPage() {
  return (
    <AppShell active="Anonymous">
      <AnonymousInbox />
    </AppShell>
  );
}
