'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';

export type Pricing = { options: Array<{ days: 1 | 5 | 7; priceNaira: number }>; freeAdDays: number };

export type Campaign = {
  id: string; advertiser: string; title: string; body: string; objective: 'website' | 'whatsapp' | 'call'; status: 'pending_payment' | 'active' | 'paused' | 'removed';
  days: number; priceNaira: number; targets: string[]; startsAt: string; endsAt: string | null; mediaType: string; mediaUrl: string | null; ctaLabel: string;
  views: number; clicks: number; people: number;
};

export type NewCampaign = {
  advertiser: string; objective: string; contact: string; title: string; body: string; mediaPath?: string; targets: string[]; days?: number; useFreeDays?: boolean;
};

export const fetchPricing = () => apiRequest<Pricing>('/api/v1/ads/pricing');
export const fetchCampaigns = (session: Session) => apiRequest<{ freeAdDays: number; campaigns: Campaign[] }>('/api/v1/ads/campaigns', { session });
export const createCampaign = (session: Session, body: NewCampaign) =>
  apiRequest<{ id: string; status: string; free?: boolean; authorizationUrl?: string }>('/api/v1/ads/campaigns', { session, method: 'POST', body });
export const payForCampaign = (session: Session, id: string) =>
  apiRequest<{ authorizationUrl: string }>(`/api/v1/ads/campaigns/${id}`, { session, method: 'POST' });
export const setCampaignStatus = (session: Session, id: string, status: 'paused' | 'active') =>
  apiRequest(`/api/v1/ads/campaigns/${id}`, { session, method: 'PATCH', body: { status } });

export const OBJECTIVE_COPY = {
  website: { title: 'Website visits', help: 'Send people to your website.', label: 'Your website', placeholder: 'https://yourbusiness.com', button: 'Visit website' },
  whatsapp: { title: 'WhatsApp chats', help: 'People tap and start a WhatsApp chat with you.', label: 'WhatsApp number or link', placeholder: '0803 123 4567 or https://wa.me/2348031234567', button: 'Chat on WhatsApp' },
  call: { title: 'Phone calls', help: 'People tap and call you.', label: 'Phone number', placeholder: '0803 123 4567', button: 'Call now' },
} as const;
