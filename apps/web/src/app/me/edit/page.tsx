import { AppShell } from '@/features/app/AppShell';
import { EditProfile } from '@/features/profile/ProfileScreens';

export default function EditProfilePage() {
  return (
    <AppShell active="Me" hideNav>
      <EditProfile />
    </AppShell>
  );
}
