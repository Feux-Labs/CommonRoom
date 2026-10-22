import type { RoomPost } from '@/lib/room-contracts';

export const demoRoomPosts: RoomPost[] = [
  {
    id: 'demo-room-library',
    authorId: 'demo-author-amara',
    authorUsername: 'amara.study',
    authorName: 'Amara Okafor',
    authorAvatar: null,
    school: 'Campus',
    caption: 'Found a quiet corner in the library for a little study break 📚',
    mediaUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'photo',
    likes: 18,
    comments: 4,
    saves: 0,
    shares: 2,
    tags: ['#studyspot', '#campuslife'],
    time: '12m ago',
    mediaItems: [{ uri: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80', mediaType: 'photo' }],
    pollOptions: [],
    audience: 'Public',
    ageRestricted: false,
    allowComments: true,
    allowReuse: true,
    liked: false,
    saved: false,
    createdAt: '2026-10-22T09:40:00.000Z',
    score: 18,
  },
  {
    id: 'demo-room-campus-lunch',
    authorId: 'demo-author-tomi',
    authorUsername: 'tomi.t',
    authorName: 'Tomi Adeyemi',
    authorAvatar: null,
    school: 'Campus',
    caption: 'Finally got the lunch break I needed. What’s your campus go-to? 🍽️',
    mediaUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'photo',
    likes: 26,
    comments: 9,
    saves: 0,
    shares: 1,
    tags: ['#food'],
    time: '35m ago',
    mediaItems: [{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80', mediaType: 'photo' }],
    pollOptions: [],
    audience: 'Public',
    ageRestricted: false,
    allowComments: true,
    allowReuse: true,
    liked: false,
    saved: false,
    createdAt: '2026-10-22T09:17:00.000Z',
    score: 11,
  },
  {
    id: 'demo-room-garden',
    authorId: 'demo-author-zara',
    authorUsername: 'zara.outside',
    authorName: 'Zara A.',
    authorAvatar: null,
    school: 'Campus',
    caption: 'A few seconds of calm between lectures 🌿',
    mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    mediaType: 'video',
    likes: 19,
    comments: 6,
    saves: 0,
    shares: 0,
    tags: ['#campuslife', '#slowdown'],
    time: '1h ago',
    mediaItems: [{ uri: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', mediaType: 'video' }],
    pollOptions: [],
    audience: 'Public',
    ageRestricted: false,
    allowComments: true,
    allowReuse: true,
    liked: false,
    saved: false,
    createdAt: '2026-10-22T08:52:00.000Z',
    score: 6,
  },
];

export type DemoMeetProfile = {
  user_id: string;
  display_name: string;
  school: string;
  bio: string;
  interests: string[];
  photo_urls: string[];
  username: string;
  course: string;
  year: string;
  avatar_url: null;
};

export const demoMeetProfiles: DemoMeetProfile[] = [
  {
    user_id: 'demo-connect-zara',
    display_name: 'Zara A.',
    school: 'Campus',
    bio: 'Usually looking for a new playlist, a good book, or a reason to get outside between classes.',
    interests: ['Music', 'Books', 'Walking'],
    photo_urls: [],
    username: 'zara.demo',
    course: 'Environmental Science',
    year: 'Year 2',
    avatar_url: null,
  },
  {
    user_id: 'demo-connect-kene',
    display_name: 'Kene N.',
    school: 'Campus',
    bio: 'Football on weekends, films during the week. Always up for a friendly conversation.',
    interests: ['Football', 'Films', 'Design'],
    photo_urls: [],
    username: 'kene.demo',
    course: 'Computer Science',
    year: 'Year 3',
    avatar_url: null,
  },
  {
    user_id: 'demo-connect-bisi',
    display_name: 'Bisi O.',
    school: 'Campus',
    bio: 'Trying new food spots and making time for creative projects around a busy timetable.',
    interests: ['Cooking', 'Art', 'Travel'],
    photo_urls: [],
    username: 'bisi.demo',
    course: 'Mass Communication',
    year: 'Year 1',
    avatar_url: null,
  },
];

export type DemoAnonymousPost = {
  id: string;
  scope: 'all_nigerian_schools';
  school: null;
  title: string;
  body: string;
  author_handle: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: false;
  is_mine: false;
  created_at: string;
  media_items: { path: string; mediaType: 'photo' | 'video' }[];
  card_theme: string;
};

export const demoAnonymousPosts: DemoAnonymousPost[] = [
  {
    id: 'demo-anon-deadline',
    scope: 'all_nigerian_schools',
    school: null,
    title: 'A little fresh air',
    body: 'Taking a minute outside between classes. Hope you get a breather too 🌿',
    author_handle: 'QuietCloud',
    likes_count: 24,
    comments_count: 5,
    liked_by_me: false,
    is_mine: false,
    created_at: '2026-10-22T09:50:00.000Z',
    media_items: [{ path: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', mediaType: 'photo' }],
    card_theme: 'soft-sky',
  },
  {
    id: 'demo-anon-groupwork',
    scope: 'all_nigerian_schools',
    school: null,
    title: 'Study spot of the day',
    body: 'Found a quiet place to focus for a bit. Where do you go when you need to lock in? 📚',
    author_handle: 'NoNamesHere',
    likes_count: 31,
    comments_count: 12,
    liked_by_me: false,
    is_mine: false,
    created_at: '2026-10-22T09:20:00.000Z',
    media_items: [{ path: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80', mediaType: 'photo' }],
    card_theme: 'warm-glow',
  },
  {
    id: 'demo-anon-balance',
    scope: 'all_nigerian_schools',
    school: null,
    title: 'A tiny campus garden moment',
    body: 'A peaceful little moment from today. What’s helping you reset lately?',
    author_handle: 'BlueHour',
    likes_count: 14,
    comments_count: 8,
    liked_by_me: false,
    is_mine: false,
    created_at: '2026-10-22T08:45:00.000Z',
    media_items: [{ path: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', mediaType: 'video' }],
    card_theme: 'blue-hour',
  },
];
