import type { FeedPost, FeedPostType } from './domain';

export type RoomScope = 'for_you' | 'general' | 'trending';

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
  author_avatar?: string | null;
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

export type RoomFeedPage = {
  posts: RoomPost[];
  hasMore: boolean;
  nextCursor: string | null;
};
