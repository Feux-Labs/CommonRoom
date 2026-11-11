import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BootScreen } from '@/features/app/AppShell';
import { ROOM_ENABLED } from '@/lib/features';
import { CreateRoute } from '@/features/create/CreateRoute';

export const metadata: Metadata = { title: 'New post · Common Room' };

async function CreateContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { to } = await searchParams;
  return <CreateRoute destination={to === 'anonymous' || !ROOM_ENABLED ? 'anonymous' : 'room'} />;
}

export default function CreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<BootScreen label="Opening composer" />}>
      <CreateContent searchParams={searchParams} />
    </Suspense>
  );
}
