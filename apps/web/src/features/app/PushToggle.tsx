'use client';

import { useEffect, useState } from 'react';
import { apiRequest, errorMessage } from './api';
import { useAppSession } from './AppSession';

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

type State = 'checking' | 'unsupported' | 'ios-install' | 'blocked' | 'off' | 'on';

/** Turn alerts on or off for this device (new anonymous messages, replies, support answers). Works for guests too. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { session, ready } = useAppSession();
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone;
        if (active) setState(ios ? 'ios-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') { if (active) setState('blocked'); return; }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const existing = await registration.pushManager.getSubscription();
        if (active) setState(existing && Notification.permission === 'granted' ? 'on' : 'off');
      } catch {
        if (active) setState('unsupported');
      }
    })();
    return () => { active = false; };
  }, [ready]);

  const turnOn = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState(permission === 'denied' ? 'blocked' : 'off'); return; }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const { publicKey } = await apiRequest<{ publicKey: string }>('/api/v1/push/key');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
      await apiRequest('/api/v1/push/subscribe', { session, method: 'POST', body: subscription.toJSON() });
      setState('on');
    } catch (turnOnError) {
      setError(errorMessage(turnOnError, 'Alerts could not be turned on.'));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiRequest('/api/v1/push/subscribe', { session, method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState('off');
    } catch (turnOffError) {
      setError(errorMessage(turnOffError, 'Alerts could not be turned off.'));
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking' || state === 'unsupported') return null;
  const text = state === 'on' ? 'Alerts are on for this device.' : state === 'blocked' ? 'Alerts are blocked in your browser settings for this site.' : state === 'ios-install' ? 'On iPhone, add Common Room to your home screen first, then you can turn on alerts.' : 'Get an alert on this device for new messages and replies. They never say who it was.';

  return (
    <div className={compact ? 'cr-push cr-push--compact' : 'cr-push'} role="group" aria-label="Alerts">
      <span>{text}</span>
      {state === 'off' ? <button className="cr-ghost" disabled={busy} onClick={() => void turnOn()} type="button">{busy ? 'One sec…' : 'Turn on alerts'}</button> : null}
      {state === 'on' ? <button className="cr-ghost" disabled={busy} onClick={() => void turnOff()} type="button">Turn off</button> : null}
      {error ? <span role="alert" style={{ color: '#b3261e' }}>{error}</span> : null}
    </div>
  );
}
