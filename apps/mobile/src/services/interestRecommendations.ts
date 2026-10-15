import type { FeedPost } from '../types/domain';

export function rankPostsForInterests(posts: FeedPost[], interests: string[]): FeedPost[] {
  const selected = new Set(interests.map(normalizeInterest));
  if (selected.size === 0) return posts;

  return posts
    .map((post) => ({
      post,
      matchCount: (post.interests ?? []).filter((interest) => selected.has(normalizeInterest(interest))).length,
    }))
    .filter(({ matchCount }) => matchCount > 0)
    .sort((first, second) => {
      if (first.matchCount !== second.matchCount) return second.matchCount - first.matchCount;
      return second.post.likes + second.post.comments - (first.post.likes + first.post.comments);
    })
    .map(({ post }) => post);
}

function normalizeInterest(interest: string): string {
  return interest.trim().toLocaleLowerCase();
}
