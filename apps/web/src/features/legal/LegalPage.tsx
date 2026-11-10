import type { ReactNode } from 'react';
import Link from 'next/link';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="cr-legal">
      <Link className="cr-legal__back" href="/anonymous">← Common Room</Link>
      <h1>{title}</h1>
      <p className="cr-legal__date">Last updated {updated}</p>
      {children}
      <p className="cr-legal__contact">
        Questions or requests: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : 'use the report option in the app'}.
      </p>
      <nav aria-label="Legal" className="cr-legal__nav">
        <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/guidelines">Community Guidelines</Link>
      </nav>
    </main>
  );
}
