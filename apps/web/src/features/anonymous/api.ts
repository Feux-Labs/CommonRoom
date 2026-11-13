'use client';

import type { Session } from '@supabase/supabase-js';
import { mediaUrlFor } from '@/lib/media-url';

export type AnonScope = 'school' | 'all_nigerian_schools';
/** `sensitive` is set by the author: the feed hides the media behind a tap. */
export type AnonMediaItem = { path: string; mediaType: 'photo' | 'video'; sensitive?: boolean };

export type AnonPost = {
  id: string;
  scope: AnonScope;
  school: string | null;
  title: string;
  body: string;
  author_handle: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  created_at: string;
  media_items?: AnonMediaItem[];
  card_theme?: string;
  edited?: boolean;
};

export type AnonPostPage = { posts: AnonPost[]; hasMore: boolean; nextCursor: string | null };
export type AnonComment = { id: string; parent_comment_id: string | null; author_handle: string; body: string; created_at: string };
export type AnonIdentity = { handle: string; created_at: string };
export type InboxLink = { token: string; enabled: boolean; prompt?: string | null; prompt_theme?: string | null };
export type InboxThread = { id: string; last_message: string | null; last_message_at: string | null; message_count: number; participant?: string };
export type InboxMessage = { id: string; body: string; is_mine: boolean; participant_label: string; created_at: string; other_handle?: string };
export type ReportTargetKind = 'post' | 'comment' | 'message';

/** Topic labels from mockup 13. Stored in the post title until the API has a topic field. */
export const ANON_TOPICS = ['Campus life', 'Library', 'Food', 'Hostel', 'Academics', 'Other'] as const;
export type AnonTopic = (typeof ANON_TOPICS)[number];
export const ANON_POST_MAX = 300;

/** Older posts were saved with these topic names; they are shown with neutral wording. */
const TOPIC_LABELS: Record<string, string> = { 'Campus life': 'Everyday life', Hostel: 'Home life', Academics: 'Learning' };

export function topicOf(post: Pick<AnonPost, 'title'>): string | null {
  const title = post.title?.trim();
  if (!title) return null;
  return (ANON_TOPICS as readonly string[]).includes(title) ? (TOPIC_LABELS[title] ?? title) : null;
}

export class AnonymousApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'AnonymousApiError';
  }
}

type Envelope<T> = { data: T };
type Failure = { error?: { code?: string; message?: string } };

/** Calls /api/v1/anonymous/*. GET works without a session (public browsing); writes need one. */
export async function anonRequest<T>(session: Session | null, path: string, method = 'GET', payload?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`/api/v1/anonymous${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch {
    throw new AnonymousApiError('We could not reach Common Room. Check your connection and try again.', 0, 'network');
  }
  const result = (await response.json().catch(() => null)) as Envelope<T> | Failure | null;
  if (!response.ok) {
    const failure = result as Failure | null;
    throw new AnonymousApiError(failure?.error?.message ?? `Request failed with status ${response.status}.`, response.status, failure?.error?.code);
  }
  if (!result || !('data' in result)) throw new AnonymousApiError('The Anonymous service returned an invalid response.', response.status);
  return result.data;
}

export function anonMediaUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return mediaUrlFor(path);
}

export function inboxLinkUrl(token: string): string {
  return `${window.location.origin}/anonymous/inbox/${token}`;
}

/** After posting, your new post is shown first; everything else keeps the server's hot order. */
export function pinFirst(posts: AnonPost[], pinId?: string | null): AnonPost[] {
  const pinned = pinId ? posts.find((post) => post.id === pinId) : undefined;
  return pinned ? [pinned, ...posts.filter((post) => post !== pinned)] : posts;
}

export function mergeUnique(current: AnonPost[], incoming: AnonPost[]): AnonPost[] {
  const seen = new Set(current.map((post) => post.id));
  const added = incoming.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
  return added.length ? [...current, ...added] : current;
}
