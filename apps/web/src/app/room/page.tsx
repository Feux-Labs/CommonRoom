import type { Metadata } from 'next';
import { RoomRoute } from '@/features/room/RoomRoute';

export const metadata: Metadata = { title: 'Room · Common Room' };

export default function RoomPage() {
  return <RoomRoute />;
}
