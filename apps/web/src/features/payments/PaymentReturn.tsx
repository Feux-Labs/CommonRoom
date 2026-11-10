'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { apiRequest } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';

type Outcome = 'checking' | 'paid' | 'pending' | 'failed' | 'error';

/** Where Paystack sends the buyer back to. We ask the server to confirm the payment with Paystack. */
export function PaymentReturn() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref') ?? '';
  const { account, ready } = useAppSession();
  const [outcome, setOutcome] = useState<Outcome>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !account || !reference) return;
    let active = true;
    void (async () => {
      try {
        const { status } = await apiRequest<{ status: string }>(`/api/v1/payments/verify?reference=${encodeURIComponent(reference)}`, { session: account });
        if (!active) return;
        setOutcome(status === 'applied' || status === 'already' ? 'paid' : status === 'failed' || status === 'mismatch' ? 'failed' : 'pending');
      } catch {
        if (active) setOutcome('error');
      }
    })();
    return () => { active = false; };
  }, [account, ready, reference, attempt]);

  const retry = <button className="cr-pbtn cr-pbtn--l" onClick={() => { setOutcome('checking'); setAttempt((value) => value + 1); }} type="button">Check again</button>;

  return (
    <main className="cr-screen">
      {!reference ? <StateBlock description="This page opens after you pay." icon="warn" title="No payment to check" />
        : !ready || (account && outcome === 'checking') ? <StateBlock description="One moment while we confirm your payment." icon="bell" title="Checking your payment…" />
        : !account ? <StateBlock description="Sign in again to see your payment." icon="warn" title="Sign in to continue" />
        : outcome === 'paid' ? <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/me">Back to my profile</Link>} description="Thank you. It is on your account now." icon="bell" title="Payment received" />
        : outcome === 'pending' ? <StateBlock actions={retry} description="Your bank hasn’t confirmed it yet. This can take a minute." icon="warn" title="Still waiting" />
        : outcome === 'failed' ? <StateBlock actions={<Link className="cr-pbtn cr-pbtn--l" href="/me">Back to my profile</Link>} description="The payment didn’t go through and you weren’t charged for it." icon="warn" role="alert" title="Payment not completed" />
        : <StateBlock actions={retry} description="We couldn’t check it just now. If money left your account, don’t pay again: it will be added." icon="warn" role="alert" title="We couldn’t confirm it yet" />}
    </main>
  );
}
