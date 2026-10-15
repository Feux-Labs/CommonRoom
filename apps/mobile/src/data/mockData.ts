import type { FeedPost } from '../types/domain';

export const campusImages = {
  feed:
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1100&q=80',
  student:
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80',
  group:
    'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1100&q=80',
  event:
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80',
  campusLife:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  campusTrivia:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
  wordPuzzle:
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
  truthOrDare:
    'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
  hostel:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  lecture:
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
};

export const feedPosts: FeedPost[] = [
  {
    id: 'feed-1',
    authorUsername: 'real_joyce',
    authorName: 'Joyce A.',
    school: 'University of Lagos',
    caption: 'Another day, another lecture. ABU life is a vibe though!',
    mediaUrl: campusImages.feed,
    mediaType: 'photo',
    likes: 12400,
    comments: 342,
    saves: 1210,
    shares: 568,
    tags: ['#ABU', '#CampusLife', '#StudentLife', '#GoodVibes'],
    interests: ['Campus life'],
    time: '2h ago',
    location: 'ABU Campus',
  },
  {
    id: 'feed-2',
    authorUsername: 'mide_b',
    authorName: 'Mide B.',
    school: 'University of Lagos',
    caption: 'The study group finally found the perfect quiet corner in the library. Who else is still prepping for exams?',
    mediaUrl: campusImages.lecture,
    mediaType: 'photo',
    likes: 8920,
    comments: 189,
    saves: 760,
    shares: 210,
    tags: ['#ExamMode', '#LibraryWins'],
    interests: ['Study tips', 'Campus life'],
    time: '5h ago',
    location: 'Unilag Main Library',
  },
  {
    id: 'feed-3',
    authorUsername: 'nana_question',
    authorName: 'Nana Q.',
    school: 'Federal University of Technology',
    caption: 'What is the one campus tradition that still feels iconic even after years?',
    mediaUrl: campusImages.student,
    mediaType: 'question',
    likes: 5210,
    comments: 438,
    saves: 201,
    shares: 118,
    tags: ['#CampusTraditions'],
    interests: ['Campus life', 'Arts'],
    time: '1d ago',
    location: 'School community',
  },
];

export const games = [
  {
    title: 'Trivia',
    description: 'Win bragging rights with campus facts, random knowledge and quickfire rounds.',
    players: '12.4K playing',
    tone: 'purple',
    image: campusImages.campusTrivia,
    badge: 'Live now',
  },
  {
    title: 'School Life',
    description: 'Build friendships, find your campus rhythm, and make your own school-life choices.',
    players: '9.1K playing',
    tone: 'rose',
    image: campusImages.campusLife,
    badge: 'Coming soon',
  },
  {
    title: 'Puzzle',
    description: 'Find the hidden words, stretch your vocabulary and chase today’s streak.',
    players: '8.7K playing',
    tone: 'blue',
    image: campusImages.wordPuzzle,
    badge: 'Streak',
  },
  {
    title: 'Truth or Dare',
    description: 'Pick a side, answer honestly, and make game night unforgettable.',
    players: '6.3K playing',
    tone: 'rose',
    image: campusImages.truthOrDare,
    badge: 'PLAY NOW',
  },
];

export const recentlyPlayedGames = [
  { title: 'Trivia', played: '2h ago', tone: 'purple', image: campusImages.campusTrivia },
  { title: 'School Life', played: '4h ago', tone: 'rose', image: campusImages.campusLife },
  { title: 'Puzzle', played: '6h ago', tone: 'blue', image: campusImages.wordPuzzle },
  {
    title: 'Truth or Dare',
    played: '8h ago',
    tone: 'rose',
    image: campusImages.truthOrDare,
  },
];

export const createActions = [
  { title: 'Create Clip', body: 'Post a short-form clip', icon: 'Video' },
  { title: 'Record Video', body: 'Share a longer video', icon: 'Video' },
  { title: 'Upload Photos', body: 'Share from your gallery', icon: 'Image' },
  { title: 'Text Post', body: 'Share your thoughts', icon: 'Text' },
  { title: 'Poll', body: 'Ask your community', icon: 'Poll' },
  { title: 'Question', body: 'Get opinions', icon: 'Question' },
  { title: 'Group Post', body: 'Post to a group', icon: 'Group' },
];

export const recentDrafts = [
  {
    title: 'Campus life is the best life...',
    type: 'Text post',
    updated: '2h ago',
    image: campusImages.group,
  },
];

export const anonymousPosts = [
  {
    scope: 'University of Lagos',
    title: 'Library confession',
    body: 'I pretend to be reading in the library but I am mostly avoiding hostel noise. Somehow it still works.',
    likes: '428',
    comments: '61',
    tone: 'study',
  },
  {
    scope: 'All Nigerian Schools',
    title: 'Food money mathematics',
    body: 'How does allowance disappear after two plates, one transport fare and printing handout?',
    likes: '1.8K',
    comments: '214',
    tone: 'campus',
  },
  {
    scope: 'Bells University',
    title: 'Group project truth',
    body: 'Every group has one person doing slides, one person typing, and three people saying "send the doc".',
    likes: '963',
    comments: '89',
    tone: 'social',
  },
];
