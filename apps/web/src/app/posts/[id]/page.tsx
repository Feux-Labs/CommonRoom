import { Suspense } from 'react';
import { BootScreen } from '@/features/app/AppShell';
import { RoomRoute } from '@/features/room/RoomRoute';

async function SharedPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomRoute focusPostId={id} />;
}

export default function SharedPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<BootScreen label="Opening post" />}>
      <SharedPost params={params} />
    </Suspense>
  );
}
