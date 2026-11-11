'use client';

import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/features/app/api';
import type { RoomPost } from '@/lib/room-contracts';

export type PersonSummary = {
  id: string;
  display_name: string;
  username: string | null;
  school: string | null;
  avatar_url: string | null;
};

export type PersonProfile = PersonSummary & {
  bio: string;
  following: boolean;
  follower_count: number;
  pro?: boolean;
  interests: string[];
  posts: RoomPost[];
};

export function fetchPerson(session: Session, id: string) {
  return apiRequest<PersonProfile>(`/api/v1/people/${encodeURIComponent(id)}`, { session });
}

export function searchPeople(session: Session, query: string, signal?: AbortSignal) {
  return apiRequest<PersonSummary[]>(`/api/v1/people?q=${encodeURIComponent(query)}`, { session, signal });
}

export type PersonSuggestion = PersonSummary & { reason: string };

export function fetchSuggestions(session: Session) {
  return apiRequest<PersonSuggestion[]>('/api/v1/people/suggestions', { session });
}

export function setFollowing(session: Session, userId: string, follow: boolean) {
  return apiRequest<{ following: boolean }>('/api/v1/follows', { session, method: follow ? 'POST' : 'DELETE', body: { userId } });
}

/** First image of a Room post, for profile grids. */
export function postThumbnail(post: RoomPost): string | null {
  const item = post.mediaItems?.find((media) => media.mediaType === 'photo') ?? post.mediaItems?.[0];
  if (item?.mediaType === 'photo') return item.uri;
  if (item?.poster) return item.poster;
  return post.mediaType === 'photo' && post.mediaUrl ? post.mediaUrl : null;
}
