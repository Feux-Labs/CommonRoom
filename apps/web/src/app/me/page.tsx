import type { Metadata } from 'next';
import { AppShell } from '@/features/app/AppShell';
import { MyProfile } from '@/features/profile/ProfileScreens';

export const metadata: Metadata = { title: 'Profile · Common Room' };

export default function MePage() {
  return (
    <AppShell active="Me">
      <MyProfile />
    </AppShell>
  );
}
