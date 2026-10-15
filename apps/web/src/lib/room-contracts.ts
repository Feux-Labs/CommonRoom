import type { Audience, FeedPost, MediaItem, MediaType } from '@/lib/contracts';

export type RoomScope = 'for_you' | 'general' | 'following';

export type RoomPost = FeedPost & {
  authorId: string;
  authorAvatar?: string | null;
  liked: boolean;
  saved: boolean;
  createdAt: string;
  score?: number;
};

export type RoomComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};

export type RoomPerson = {
  id: string;
  display_name: string;
  username: string | null;
  school: string | null;
  bio: string;
  avatar_url: string | null;
  following: boolean;
  follower_count: number;
};

export type RoomProfile = RoomPerson & {
  interests: string[];
  posts: RoomPost[];
};

export type RoomStory = {
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  seen: boolean;
  items: RoomPost[];
};

export type RoomConversation = {
  id: string;
  other: RoomPerson;
  last_message: string | null;
  last_message_at: string;
};

export type RoomMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type RoomFeedPage = {
  posts: RoomPost[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type { Audience, MediaItem, MediaType };
