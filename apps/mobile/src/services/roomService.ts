import { apiRequest } from './api';
import { campusImages } from '../data/mockData';
import type {
  RoomComment,
  RoomFeedPage,
  RoomPerson,
  RoomPost,
  RoomProfile,
  RoomScope,
  RoomStory,
} from '../types/room';

// ---------------------------------------------------------------------------
// Rich Initial Seed Data
// Guaranteed to show immediately so the user never sees an empty screen
// ---------------------------------------------------------------------------
const INITIAL_POSTS: RoomPost[] = [
  {
    id: 'room-post-1',
    authorId: 'user-joyce',
    authorUsername: 'real_joyce',
    authorName: 'Joyce A.',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    school: 'Ahmadu Bello University',
    caption: 'Another day, another 8 AM lecture! ABU campus morning breeze is unmatched. Central cafeteria after this? ☕📚',
    mediaUrl: campusImages.feed,
    mediaType: 'photo',
    likes: 1240,
    comments: 48,
    saves: 112,
    shares: 34,
    liked: false,
    saved: false,
    tags: ['#ABU', '#CampusLife', '#StudentLife', '#GoodVibes'],
    interests: ['Campus life', 'Study tips'],
    time: '2h ago',
    location: 'ABU Main Campus, Zaria',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    score: 95,
  },
  {
    id: 'room-post-2',
    authorId: 'user-mide',
    authorUsername: 'mide_b',
    authorName: 'Mide B.',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    school: 'University of Lagos',
    caption: 'The study group finally secured the quiet corner on the 3rd floor of the Unilag library. Who else is cramming for semester exams? Drop your study hacks! 👇',
    mediaUrl: campusImages.lecture,
    mediaType: 'photo',
    likes: 890,
    comments: 63,
    saves: 215,
    shares: 19,
    liked: false,
    saved: false,
    tags: ['#Unilag', '#ExamSeason', '#LibraryGrind'],
    interests: ['Study tips', 'Campus life'],
    time: '4h ago',
    location: 'Unilag Main Library, Akoka',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    score: 88,
  },
  {
    id: 'room-post-3',
    authorId: 'user-nana',
    authorUsername: 'nana_q',
    authorName: 'Nana Q.',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    school: 'Federal University of Technology, Minna',
    caption: 'What is that ONE campus tradition that still feels iconic no matter how many years pass? For us it has to be the hostel cookout competitions! 🔥🥘',
    mediaUrl: campusImages.student,
    mediaType: 'question',
    likes: 642,
    comments: 91,
    saves: 44,
    shares: 28,
    liked: false,
    saved: false,
    tags: ['#FUTMinna', '#CampusTraditions', '#HostelVibes'],
    interests: ['Campus life', 'Social'],
    time: '6h ago',
    location: 'Bosso Campus, Minna',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    score: 82,
  },
  {
    id: 'room-post-4',
    authorId: 'user-chidi',
    authorUsername: 'chidi_tech',
    authorName: 'Chidi Eze',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    school: 'University of Nigeria, Nsukka',
    caption: 'Final year engineering presentation done and dusted! Big thanks to the dream team. Campus tech community really supported us through the late nights. 🚀💻',
    mediaUrl: campusImages.group,
    mediaType: 'photo',
    likes: 1540,
    comments: 112,
    saves: 88,
    shares: 67,
    liked: false,
    saved: false,
    tags: ['#UNN', '#LionsAndLionesses', '#TechStudents', '#FinalYear'],
    interests: ['Tech', 'Career', 'Campus life'],
    time: '8h ago',
    location: 'UNN Faculty of Engineering, Nsukka',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    score: 92,
  },
  {
    id: 'room-post-5',
    authorId: 'user-zainab',
    authorUsername: 'zainab_a',
    authorName: 'Zainab Aliyu',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    school: 'Bayero University Kano',
    caption: 'Golden hour at the new faculty quad. BUK campus looks mesmerizing in the evening light 🌅📸 Who else loves photography on campus?',
    mediaUrl: campusImages.campusLife,
    mediaType: 'photo',
    likes: 720,
    comments: 35,
    saves: 140,
    shares: 22,
    liked: false,
    saved: false,
    tags: ['#BUK', '#KanoVibes', '#CampusSunset'],
    interests: ['Arts', 'Photography', 'Campus life'],
    time: '12h ago',
    location: 'BUK New Campus, Kano',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    score: 79,
  },
  {
    id: 'room-post-6',
    authorId: 'user-tobi',
    authorUsername: 'tobi_vibes',
    authorName: 'Tobi F.',
    authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    school: 'Obafemi Awolowo University',
    caption: 'Motion Ground on a Friday evening is a sacred OAU ritual! Great music, good vibes, and genuine campus connection. Have an amazing weekend everyone! 🎵✨',
    mediaUrl: campusImages.event,
    mediaType: 'photo',
    likes: 1890,
    comments: 142,
    saves: 304,
    shares: 88,
    liked: false,
    saved: false,
    tags: ['#OAU', '#GreatIfe', '#MotionGround', '#WeekendVibes'],
    interests: ['Music', 'Social', 'Campus life'],
    time: '1d ago',
    location: 'Motion Ground, OAU Ile-Ife',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    score: 98,
  },
];

const INITIAL_STORIES: RoomStory[] = [
  {
    authorId: 'user-joyce',
    authorName: 'Joyce A.',
    authorUsername: 'real_joyce',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[0]],
  },
  {
    authorId: 'user-mide',
    authorName: 'Mide B.',
    authorUsername: 'mide_b',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[1]],
  },
  {
    authorId: 'user-nana',
    authorName: 'Nana Q.',
    authorUsername: 'nana_q',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[2]],
  },
  {
    authorId: 'user-chidi',
    authorName: 'Chidi Eze',
    authorUsername: 'chidi_tech',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[3]],
  },
  {
    authorId: 'user-zainab',
    authorName: 'Zainab Aliyu',
    authorUsername: 'zainab_a',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[4]],
  },
  {
    authorId: 'user-tobi',
    authorName: 'Tobi F.',
    authorUsername: 'tobi_vibes',
    authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    seen: false,
    items: [INITIAL_POSTS[5]],
  },
];

const INITIAL_COMMENTS: Record<string, RoomComment[]> = {
  'room-post-1': [
    {
      id: 'c-1',
      post_id: 'room-post-1',
      author_id: 'user-mide',
      author_name: 'Mide B.',
      author_username: 'mide_b',
      author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      body: '8 AM lectures in harmattan weather require maximum courage! Enjoy cafeteria food!',
      parent_id: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'c-2',
      post_id: 'room-post-1',
      author_id: 'user-joyce',
      author_name: 'Joyce A.',
      author_username: 'real_joyce',
      author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      body: 'Haha so true! Hot tea is already waiting for me ☕',
      parent_id: 'c-1',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'c-3',
      post_id: 'room-post-1',
      author_id: 'user-chidi',
      author_name: 'Chidi Eze',
      author_username: 'chidi_tech',
      author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      body: 'Save a seat at the cafeteria table for tech folks!',
      parent_id: null,
      created_at: new Date(Date.now() - 900000).toISOString(),
    },
  ],
  'room-post-2': [
    {
      id: 'c-4',
      post_id: 'room-post-2',
      author_id: 'user-nana',
      author_name: 'Nana Q.',
      author_username: 'nana_q',
      author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      body: 'Pomodoro timer 25m on, 5m off! It changed my entire exam prep routine.',
      parent_id: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

const INITIAL_PROFILES: Record<string, RoomProfile> = {
  'user-joyce': {
    id: 'user-joyce',
    display_name: 'Joyce A.',
    username: 'real_joyce',
    school: 'Ahmadu Bello University',
    bio: 'Microbiology major @ ABU 🔬 | Campus ambassador | Book lover & coffee enthusiast',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 1240,
    interests: ['Campus life', 'Study tips', 'Microbiology'],
    posts: [INITIAL_POSTS[0]],
  },
  'user-mide': {
    id: 'user-mide',
    display_name: 'Mide B.',
    username: 'mide_b',
    school: 'University of Lagos',
    bio: 'Economics @ Unilag | Data geek | Fintech enthusiast | Lagos boy',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 890,
    interests: ['Study tips', 'Campus life', 'Fintech'],
    posts: [INITIAL_POSTS[1]],
  },
  'user-nana': {
    id: 'user-nana',
    display_name: 'Nana Q.',
    username: 'nana_q',
    school: 'Federal University of Technology, Minna',
    bio: 'Architecture student | Creative mind | Foodie & campus life commentator',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 642,
    interests: ['Campus life', 'Design', 'Architecture'],
    posts: [INITIAL_POSTS[2]],
  },
  'user-chidi': {
    id: 'user-chidi',
    display_name: 'Chidi Eze',
    username: 'chidi_tech',
    school: 'University of Nigeria, Nsukka',
    bio: 'Software Engineer in the making | UNN tech community lead | Building open source',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 1540,
    interests: ['Tech', 'Career', 'Programming'],
    posts: [INITIAL_POSTS[3]],
  },
  'user-zainab': {
    id: 'user-zainab',
    display_name: 'Zainab Aliyu',
    username: 'zainab_a',
    school: 'Bayero University Kano',
    bio: 'Mass Communication @ BUK | Campus reporter & mobile photographer 📷',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 720,
    interests: ['Photography', 'Journalism', 'Campus life'],
    posts: [INITIAL_POSTS[4]],
  },
  'user-tobi': {
    id: 'user-tobi',
    display_name: 'Tobi F.',
    username: 'tobi_vibes',
    school: 'Obafemi Awolowo University',
    bio: 'Theatre Arts @ Great Ife | Campus host | Music director & acoustic singer 🎸',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    following: false,
    follower_count: 1890,
    interests: ['Music', 'Theatre', 'Great Ife'],
    posts: [INITIAL_POSTS[5]],
  },
};

// ---------------------------------------------------------------------------
// In-Memory State
// ---------------------------------------------------------------------------
let cachedPosts: RoomPost[] = [...INITIAL_POSTS];
let cachedStories: RoomStory[] = [...INITIAL_STORIES];
let cachedComments: Record<string, RoomComment[]> = { ...INITIAL_COMMENTS };
let cachedProfiles: Record<string, RoomProfile> = { ...INITIAL_PROFILES };
const hiddenPostIds = new Set<string>();

// ---------------------------------------------------------------------------
// Background API Sync Helpers (Fire and Forget / Non-blocking)
// ---------------------------------------------------------------------------
async function syncFeedFromApi(scope: RoomScope): Promise<void> {
  try {
    const params = new URLSearchParams({ scope });
    const page = await apiRequest<RoomFeedPage>(`/posts?${params.toString()}`);
    if (page && Array.isArray(page.posts) && page.posts.length > 0) {
      // Merge server posts while retaining any local custom additions
      const serverMap = new Map(page.posts.map((p) => [p.id, p]));
      const existingNonServer = cachedPosts.filter((p) => !serverMap.has(p.id) && !p.id.startsWith('room-post-'));
      cachedPosts = [...page.posts.filter((p) => !hiddenPostIds.has(p.id)), ...existingNonServer];
    }
  } catch {
    // API offline or unauthenticated; continue using cached/seed data
  }
}

async function triggerApiLike(postId: string): Promise<void> {
  try {
    await apiRequest(`/posts/${postId}/like`, { method: 'POST' });
  } catch {
    // Ignore offline error
  }
}

async function triggerApiSave(postId: string): Promise<void> {
  try {
    await apiRequest(`/posts/${postId}/save`, { method: 'POST' });
  } catch {
    // Ignore offline error
  }
}

async function triggerApiComment(postId: string, body: string, parentId: string | null): Promise<void> {
  try {
    await apiRequest(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, parentId }),
    });
  } catch {
    // Ignore offline error
  }
}

async function triggerApiFollow(userId: string): Promise<void> {
  try {
    await apiRequest('/follows', {
      method: 'POST',
      body: JSON.stringify({ followingId: userId }),
    });
  } catch {
    // Ignore offline error
  }
}

async function triggerApiDelete(postId: string): Promise<void> {
  try {
    await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
  } catch {
    // Ignore offline error
  }
}

// ---------------------------------------------------------------------------
// Synchronous & Optimistic Public Service
// Directly matches HomeScreen.tsx expectations
// ---------------------------------------------------------------------------
export const roomService = {
  // ──── Feed ────────────────────────────────────────────────────────────────
  getPosts(scope: RoomScope, interests: string[] = []): RoomPost[] {
    // Trigger background sync with server
    syncFeedFromApi(scope).catch(() => {});

    let list = cachedPosts.filter((p) => !hiddenPostIds.has(p.id));

    if (scope === 'trending') {
      return [...list].sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2));
    }

    if (scope === 'general') {
      return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // 'for_you': filter or prioritize by interests if present
    if (interests.length > 0) {
      const interestSet = new Set(interests.map((i) => i.toLowerCase()));
      return [...list].sort((a, b) => {
        const aMatch = a.interests?.some((i) => interestSet.has(i.toLowerCase())) ? 1 : 0;
        const bMatch = b.interests?.some((i) => interestSet.has(i.toLowerCase())) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return list;
  },

  // ──── Stories ─────────────────────────────────────────────────────────────
  getStories(): RoomStory[] {
    return cachedStories;
  },

  markStorySeen(authorId: string): void {
    cachedStories = cachedStories.map((story) =>
      story.authorId === authorId ? { ...story, seen: true } : story
    );
  },

  // ──── Likes ───────────────────────────────────────────────────────────────
  toggleLike(postId: string): RoomPost | null {
    let updated: RoomPost | null = null;
    cachedPosts = cachedPosts.map((post) => {
      if (post.id === postId) {
        const liked = !post.liked;
        const likes = liked ? post.likes + 1 : Math.max(0, post.likes - 1);
        updated = { ...post, liked, likes };
        return updated;
      }
      return post;
    });

    if (updated) {
      triggerApiLike(postId);
    }
    return updated;
  },

  // ──── Saves ───────────────────────────────────────────────────────────────
  toggleSave(postId: string): RoomPost | null {
    let updated: RoomPost | null = null;
    cachedPosts = cachedPosts.map((post) => {
      if (post.id === postId) {
        const saved = !post.saved;
        const saves = saved ? post.saves + 1 : Math.max(0, post.saves - 1);
        updated = { ...post, saved, saves };
        return updated;
      }
      return post;
    });

    if (updated) {
      triggerApiSave(postId);
    }
    return updated;
  },

  // ──── Comments ────────────────────────────────────────────────────────────
  getComments(postId: string): RoomComment[] {
    return cachedComments[postId] ?? [];
  },

  addComment(
    postId: string,
    body: string,
    parentId: string | null = null,
    currentUser?: { displayName?: string; username?: string | null; avatarUrl?: string | null },
  ): RoomComment {
    const newComment: RoomComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      post_id: postId,
      author_id: 'current-user',
      author_name: currentUser?.displayName || 'You',
      author_username: currentUser?.username || 'you',
      author_avatar: currentUser?.avatarUrl || null,
      body: body.trim(),
      parent_id: parentId,
      created_at: new Date().toISOString(),
    };

    const existing = cachedComments[postId] || [];
    cachedComments[postId] = [...existing, newComment];

    // Update post comments counter
    cachedPosts = cachedPosts.map((post) =>
      post.id === postId ? { ...post, comments: post.comments + 1 } : post
    );

    triggerApiComment(postId, body, parentId);
    return newComment;
  },

  // ──── Profile ─────────────────────────────────────────────────────────────
  getProfile(authorId: string): RoomProfile | null {
    if (cachedProfiles[authorId]) {
      const profile = cachedProfiles[authorId];
      const authorPosts = cachedPosts.filter((p) => p.authorId === authorId);
      return { ...profile, posts: authorPosts.length > 0 ? authorPosts : profile.posts };
    }

    const authorPosts = cachedPosts.filter((p) => p.authorId === authorId);
    if (authorPosts.length > 0) {
      const first = authorPosts[0];
      return {
        id: authorId,
        display_name: first.authorName,
        username: first.authorUsername,
        school: first.school || null,
        bio: `Student at ${first.school || 'Campus'}`,
        avatar_url: first.authorAvatar ?? null,
        following: false,
        follower_count: 1,
        interests: first.interests || [],
        posts: authorPosts,
      };
    }

    return null;
  },

  // ──── Follow / Unfollow ───────────────────────────────────────────────────
  toggleFollow(authorId: string): boolean {
    let nowFollowing = false;
    if (cachedProfiles[authorId]) {
      const current = cachedProfiles[authorId];
      nowFollowing = !current.following;
      cachedProfiles[authorId] = {
        ...current,
        following: nowFollowing,
        follower_count: nowFollowing ? current.follower_count + 1 : Math.max(0, current.follower_count - 1),
      };
    }

    triggerApiFollow(authorId);
    return nowFollowing;
  },

  // ──── Hide / Delete ───────────────────────────────────────────────────────
  hidePost(postId: string): void {
    hiddenPostIds.add(postId);
    cachedPosts = cachedPosts.filter((p) => p.id !== postId);
  },

  deletePost(postId: string): boolean {
    cachedPosts = cachedPosts.filter((p) => p.id !== postId);
    triggerApiDelete(postId);
    return true;
  },

  // ──── Add local post (submitted from Create modal) ────────────────────────
  addLocalPost(post: RoomPost): void {
    cachedPosts = [post, ...cachedPosts];
  },

  // ──── Analytics fire-and-forget ───────────────────────────────────────────
  recordEvent(eventType: string, postId?: string): void {
    apiRequest('/room/events', {
      method: 'POST',
      body: JSON.stringify({ eventType, postId }),
    }).catch(() => {});
  },
};
