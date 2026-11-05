'use client';

import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;
const BACKEND_DISCONNECTED_KEY = 'commonroom:backend-disconnected';

export function getBrowserSupabase() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}

export function isBackendDisconnected() {
  return window.sessionStorage.getItem(BACKEND_DISCONNECTED_KEY) === 'true';
}

export function setBackendDisconnected(disconnected: boolean) {
  if (disconnected) {
    window.sessionStorage.setItem(BACKEND_DISCONNECTED_KEY, 'true');
  } else {
    window.sessionStorage.removeItem(BACKEND_DISCONNECTED_KEY);
  }
}
