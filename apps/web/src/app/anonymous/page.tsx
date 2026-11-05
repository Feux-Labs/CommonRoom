import { AnonymousExperience } from '@/components/AnonymousExperience';
import { AppRouteShell } from '@/components/cr/AppRouteShell';

export default function AnonymousPage() {
  return (
    <AppRouteShell active="Anonymous">
      <AnonymousExperience />
    </AppRouteShell>
  );
}
