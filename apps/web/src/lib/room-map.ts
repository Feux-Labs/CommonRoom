import type { SupabaseClient } from '@supabase/supabase-js';
import type { Audience, MediaItem, MediaType } from '@/lib/contracts';
import type { RoomPost } from '@/lib/room-contracts';

export function formatRelativeTime(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (elapsedMinutes < 1) return 'just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function relationCount(row: Record<string, unknown>, key: string) {
  const relation = row[key];
  if (typeof row[`${key}_count`] === 'number') return row[`${key}_count`] as number;
  return Array.isArray(relation) && typeof relation[0]?.count === 'number' ? relation[0].count : 0;
}

export function mapRoomPost(row: Record<string, unknown>): RoomPost {
  const items = Array.isArray(row.media_items) ? row.media_items as MediaItem[] : [];
  const createdAt = String(row.created_at);
  return {
    id: String(row.id),
    authorId: String(row.author_id ?? ''),
    authorUsername: String(row.author_username ?? 'student'),
    authorName: String(row.author_name ?? 'Student'),
    authorAvatar: typeof row.author_avatar === 'string' ? row.author_avatar : null,
    school: typeof row.school_label === 'string' ? row.school_label : '',
    caption: String(row.caption ?? ''),
    mediaUrl: items[0]?.uri ?? '',
    mediaType: (row.media_type as MediaType) ?? 'text',
    likes: typeof row.likes_count === 'number' ? row.likes_count : relationCount(row, 'post_likes'),
    comments: typeof row.comments_count === 'number' ? row.comments_count : relationCount(row, 'post_comments'),
    saves: typeof row.saves_count === 'number' ? row.saves_count : relationCount(row, 'post_saves'),
    shares: typeof row.shares_count === 'number' ? row.shares_count : relationCount(row, 'post_shares'),
    tags: (String(row.caption ?? '').match(/#[\p{L}\p{N}_]+/gu) ?? []),
    time: formatRelativeTime(createdAt),
    location: typeof row.location === 'string' ? row.location : undefined,
    mediaItems: items,
    pollOptions: Array.isArray(row.poll_options) ? row.poll_options as string[] : [],
    audience: row.audience as Audience,
    ageRestricted: row.age_restricted === true,
    allowComments: row.allow_comments !== false,
    allowReuse: row.allow_reuse !== false,
    liked: row.liked_by_me === true,
    saved: row.saved_by_me === true,
    createdAt,
    score: typeof row.score === 'number' ? row.score : undefined,
  };
}

export function encodeRoomCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');
}

const cursorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function decodeRoomCursor(value: string | null): { createdAt: string; id: string } | null | undefined {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { createdAt?: string; id?: string };
    if (typeof cursor.createdAt !== 'string' || !Number.isFinite(Date.parse(cursor.createdAt))
      || typeof cursor.id !== 'string' || !cursorIdPattern.test(cursor.id)) {
      return undefined;
    }
    return { createdAt: cursor.createdAt, id: cursor.id };
  } catch {
    return undefined;
  }
}

export async function attachRoomViewerFields(
  supabase: SupabaseClient,
  userId: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return rows;
  const postIds = rows.map((row) => String(row.id));
  const authorIds = [...new Set(rows.map((row) => String(row.author_id ?? '')).filter(Boolean))];

  const [likes, saves, shareRows, authors] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('post_shares').select('post_id').in('post_id', postIds),
    authorIds.length
      ? supabase.from('profiles').select('id, avatar_url').in('id', authorIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[], error: null }),
  ]);

  const liked = new Set((likes.error ? [] : likes.data ?? []).map((row) => row.post_id as string));
  const saved = new Set((saves.error ? [] : saves.data ?? []).map((row) => row.post_id as string));
  const shareCounts = new Map<string, number>();
  for (const row of (shareRows.error ? [] : shareRows.data ?? [])) {
    const postId = row.post_id as string;
    shareCounts.set(postId, (shareCounts.get(postId) ?? 0) + 1);
  }
  const avatars = new Map((authors.error ? [] : authors.data ?? []).map((author) => [author.id, author.avatar_url]));

  return rows.map((row) => {
    const id = String(row.id);
    return {
      ...row,
      liked_by_me: liked.has(id),
      saved_by_me: saved.has(id),
      shares_count: typeof row.shares_count === 'number' ? row.shares_count : (shareCounts.get(id) ?? 0),
      author_avatar: row.author_avatar ?? avatars.get(String(row.author_id ?? '')) ?? null,
    };
  });
}
