import type { Metadata } from 'next';
import { ModerationQueue } from '@/features/admin/ModerationQueue';

export const metadata: Metadata = { title: 'Reports · Common Room', robots: { index: false, follow: false } };

export default function ModerationPage() {
  return <ModerationQueue />;
}
