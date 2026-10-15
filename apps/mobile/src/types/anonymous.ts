export type AnonymousScope = 'school' | 'all_nigerian_schools';

export type AnonymousIdentity = {
  handle: string;
  created_at: string;
};

export type AnonymousPost = {
  id: string;
  scope: AnonymousScope;
  school: string | null;
  title: string;
  body: string;
  author_handle: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  created_at: string;
};

export type AnonymousComment = {
  id: string;
  author_handle: string;
  body: string;
  created_at: string;
};

export type AnonymousInboxLink = {
  token: string;
  enabled: boolean;
};

export type AnonymousInboxThread = {
  id: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
};

export type AnonymousInboxMessage = {
  id: string;
  body: string;
  is_mine: boolean;
  participant_label: 'Anonymous';
  created_at: string;
};
