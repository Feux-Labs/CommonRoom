'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';

export type LadderRank = { name: string; phase: string; start: number };

export type MyLevel = {
  points: number; rankNumber: number; rank: string; phase: string; step: number; stepFloor: number; nextStepAt: number | null;
  ladder: LadderRank[]; pro: boolean; proUntil: string | null; ultimatePass: boolean;
};

export const ROMAN = ['I', 'II', 'III'] as const;

export const fetchMyLevel = (session: Session) => apiRequest<MyLevel>('/api/v1/me/level', { session });
export const fetchProPrice = () => apiRequest<{ priceNaira: number; days: number }>('/api/v1/pro');
export const startProCheckout = (session: Session) =>
  apiRequest<{ authorizationUrl: string; reference: string }>('/api/v1/payments/initialize', { session, method: 'POST', body: { product: 'pro_month' } });
