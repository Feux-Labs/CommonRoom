'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';

export type LadderRank = { name: string; phase: string; start: number };

export type MyLevel = {
  points: number; rankNumber: number; rank: string; phase: string; step: number; stepFloor: number; nextStepAt: number | null;
  ladder: LadderRank[]; pro: boolean; proUntil: string | null; ultimatePass: boolean;
  earnedPoints?: number; boostPriceNaira?: number | null; boostAvailableAt?: string | null;
  streak: number; streakGap: number; priorStreak: number; guest: boolean;
};

export type Boost = { available: boolean; atSummit: boolean; from: number; to: number | null; priceNaira: number | null; nextAvailableAt: string | null };

/** Every rank has five small stars; when all five are full the big star fills and you move up. */
export const SMALL_STARS = 5;

export const fetchMyLevel = (session: Session) => apiRequest<MyLevel>('/api/v1/me/level', { session });
export const fetchBoost = (session: Session) => apiRequest<Boost>('/api/v1/me/boost', { session });
export const startBoost = (session: Session) => apiRequest<{ authorizationUrl: string }>('/api/v1/me/boost', { session, method: 'POST' });
export const fetchProPrice = () => apiRequest<{ priceNaira: number; days: number }>('/api/v1/pro');
export const startProCheckout = (session: Session) =>
  apiRequest<{ authorizationUrl: string; reference: string }>('/api/v1/payments/initialize', { session, method: 'POST', body: { product: 'pro_month' } });
