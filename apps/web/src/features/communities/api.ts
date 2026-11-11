'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';
import type { RoomPost } from '@/lib/room-contracts';

export type Community = {
  id: string; slug: string; name: string; description: string; school: string | null;
  memberCount: number; joined: boolean; isOwner: boolean;
};

export const listCommunities = (session: Session, q = '') =>
  apiRequest<Community[]>(`/api/v1/communities${q ? `?q=${encodeURIComponent(q)}` : ''}`, { session });
export const createCommunity = (session: Session, body: { name: string; description: string }) =>
  apiRequest<{ id: string; slug: string }>('/api/v1/communities', { session, method: 'POST', body });
export const getCommunity = (session: Session, slug: string) => apiRequest<Community>(`/api/v1/communities/${encodeURIComponent(slug)}`, { session });
export const communityPosts = (session: Session, slug: string) => apiRequest<RoomPost[]>(`/api/v1/communities/${encodeURIComponent(slug)}/posts`, { session });
export const setMembership = (session: Session, slug: string, join: boolean) =>
  apiRequest<{ joined: boolean }>(`/api/v1/communities/${encodeURIComponent(slug)}/members`, { session, method: join ? 'POST' : 'DELETE' });
export const deleteCommunity = (session: Session, slug: string) => apiRequest(`/api/v1/communities/${encodeURIComponent(slug)}`, { session, method: 'DELETE' });
export const reportCommunity = (session: Session, slug: string, reason: string) =>
  apiRequest(`/api/v1/communities/${encodeURIComponent(slug)}/report`, { session, method: 'POST', body: { reason } });
