'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { describeAuthError } from './auth-errors';

/**
 * Google Identity Services button. Google returns an ID token to this page
 * (so the consent screen names our domain, not the Supabase project), and
 * Supabase verifies it via signInWithIdToken. Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * and the same client ID added under Supabase → Auth → Providers → Google.
 */

type CredentialResponse = { credential?: string };
type GoogleId = {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce?: string;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google sign-in could not load.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function GoogleSignInButton({
  context,
  onSignedIn,
  onError,
  disabled = false,
}: {
  context: 'signin' | 'signup';
  onSignedIn: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const callbacks = useRef({ onSignedIn, onError });
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    callbacks.current = { onSignedIn, onError };
  }, [onError, onSignedIn]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadScript();
        const google = window.google?.accounts?.id;
        if (cancelled || !google || !container.current) return;
        // Google receives the hashed nonce; Supabase receives the raw one and compares.
        const rawNonce = crypto.randomUUID() + crypto.randomUUID();
        const hashedNonce = await sha256Hex(rawNonce);
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          ux_mode: 'popup',
          context,
          callback: (response) => {
            if (!response.credential) {
              callbacks.current.onError('Google did not return an account. Try again.');
              return;
            }
            void getBrowserSupabase().auth
              .signInWithIdToken({ provider: 'google', token: response.credential, nonce: rawNonce })
              .then(({ error }) => {
                if (error) callbacks.current.onError(describeAuthError(error).message);
                else callbacks.current.onSignedIn();
              });
          },
        });
        container.current.innerHTML = '';
        google.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: context === 'signup' ? 'signup_with' : 'continue_with',
          logo_alignment: 'left',
          width: Math.min(container.current.clientWidth || 320, 400),
        });
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, disabled]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (unavailable) return <p className="cr-auth__muted" role="status">Google sign-in is unavailable right now.</p>;
  return <div aria-label="Sign in with Google" className="cr-auth__google" ref={container} />;
}
