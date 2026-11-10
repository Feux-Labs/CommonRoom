import Link from 'next/link';
import { StateBlock } from '@/components/cr/FeedStates';

export default function NotFound() {
  return (
    <main className="cr-screen">
      <StateBlock
        actions={<Link className="cr-pbtn cr-pbtn--l" href="/anonymous">Back to Common Room</Link>}
        description="The page may have moved, or the link might be wrong."
        icon="warn"
        title="We couldn’t find that page"
      />
    </main>
  );
}
