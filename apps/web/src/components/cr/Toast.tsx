'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ToastVariant = 'success' | 'error';
type ToastItem = { id: number; message: string; variant: ToastVariant };
type ToastApi = { show: (message: string, variant?: ToastVariant) => void };

const ToastContext = createContext<ToastApi | null>(null);
const DURATION_MS = 3200;

/** One toast at a time, centred near the top like the mockup ("Link copied"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    counter.current += 1;
    setToast({ id: counter.current, message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [toast]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="cr-toast-region">
        {toast ? (
          <div className={`cr-toast-pill cr-toast-pill--${toast.variant}`} key={toast.id} role={toast.variant === 'error' ? 'alert' : 'status'}>
            {toast.message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
