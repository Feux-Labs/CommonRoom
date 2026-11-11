'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateBlock } from '@/components/cr/FeedStates';
import { Icon } from '@/components/cr/Icon';
import { errorMessage } from '@/features/app/api';
import { useAppSession } from '@/features/app/AppSession';
import { fetchMyLevel, fetchProPrice, startProCheckout, type MyLevel } from './api';
import './pro.css';

const PERKS = [
  ['A Pro badge', 'Shows next to your name on your profile.'],
  ['Double points', 'Your rank points count double until the end of Doctore.'],
  ['More Communities', 'Run up to 15 Communities instead of 5.'],
  ['No ads', 'Sponsored posts never appear in your feeds.'],
  ['Supports Common Room', 'Helps keep it free, safe and moderated for everyone.'],
] as const;

/** What Pro is, what it costs, and how to pay (Paystack opens in the same tab and returns here). */
export function ProScreen() {
  const router = useRouter();
  const { account, ready, requireAccount } = useAppSession();
  const [price, setPrice] = useState<number | null>(null);
  const [level, setLevel] = useState<MyLevel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const info = await fetchProPrice();
        if (active) setPrice(info.priceNaira);
      } catch { /* the button still works; the price just is not shown */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account) return;
    let active = true;
    void (async () => {
      try {
        await Promise.resolve();
        const result = await fetchMyLevel(account);
        if (active) setLevel(result);
      } catch { /* not shown */ }
    })();
    return () => { active = false; };
  }, [account]);

  const subscribe = async () => {
    if (!account || busy) return;
    setBusy(true);
    setError('');
    try {
      const checkout = await startProCheckout(account);
      window.location.href = checkout.authorizationUrl;
    } catch (checkoutError) {
      setError(errorMessage(checkoutError, 'We could not start the payment. Try again.'));
      setBusy(false);
    }
  };

  const until = level?.proUntil ? new Date(level.proUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <main className="cr-screen cr-pro">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Common Room Pro</h1></div>
      </header>

      {ready && !account ? (
        <StateBlock actions={<button className="cr-pbtn cr-pbtn--l" onClick={() => requireAccount('sign-in')} type="button">Sign in</button>} description="Sign in with your account to go Pro." icon="user" title="Pro is for members" />
      ) : (
        <>
          <section className="cr-pro__hero">
            <p className="cr-pro__price">{price === null ? 'Pro' : `₦${price.toLocaleString()}`}<small>{price === null ? '' : ' for 30 days'}</small></p>
            <p>One payment, 30 days of Pro. No automatic renewal: pay again when you want more time.</p>
          </section>
          <ul className="cr-pro__perks">
            {PERKS.map(([title, text]) => <li key={title}><b>{title}</b><span>{text}</span></li>)}
          </ul>
          {level?.pro ? <p className="cr-pro__status" role="status">You’re Pro until {until}. Paying again adds 30 more days.</p> : null}
          {error ? <p role="alert" style={{ color: '#b3261e' }}>{error}</p> : null}
          <button className="cr-pbtn cr-pbtn--l cr-pro__cta" disabled={busy || !account} onClick={() => void subscribe()} type="button">{busy ? 'Opening Paystack…' : level?.pro ? 'Add 30 days' : 'Go Pro'}</button>
          <p className="cr-pro__fine">Payments are handled by Paystack. We never see your card details.</p>
        </>
      )}
    </main>
  );
}
