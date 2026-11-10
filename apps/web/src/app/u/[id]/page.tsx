import { Suspense } from 'react';
import { AppShell, BootScreen } from '@/features/app/AppShell';
import { PersonProfileScreen } from '@/features/profile/ProfileScreens';

async function Person({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonProfileScreen id={id} />;
}

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell active={null}>
      <Suspense fallback={<BootScreen label="Opening profile" />}>
        <Person params={params} />
      </Suspense>
    </AppShell>
  );
}
