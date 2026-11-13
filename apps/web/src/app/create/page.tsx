import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BootScreen } from '@/features/app/AppShell';
import { ROOM_ENABLED } from '@/lib/features';
import { isFlagEnabled } from '@/lib/flags';
import { CreateRoute } from '@/features/create/CreateRoute';

export const metadata: Metadata = { title: 'New post · Common Room' };

async function CreateContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { to, c } = await searchParams;
  const communityId = typeof c === 'string' && /^[0-9a-f-]{36}$/i.test(c) ? c : undefined;
  return <CreateRoute communityId={communityId} destination={to === 'anonymous' || !ROOM_ENABLED || !(await isFlagEnabled('room_tab')) ? 'anonymous' : 'room'} />;
}

export default function CreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<BootScreen label="Opening composer" />}>
      <CreateContent searchParams={searchParams} />
    </Suspense>
  );
}
