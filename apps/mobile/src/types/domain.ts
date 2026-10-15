export type Opportunity = {
  id: string;
  title: string;
  company: string;
  type: string;
  location: string;
  compensation?: string;
  postedAt: string;
};

export type FeedPostType = 'photo' | 'video' | 'text' | 'question' | 'poll';

export type FeedPost = {
  id: string;
  authorUsername: string;
  authorName: string;
  school: string;
  caption: string;
  mediaUrl: string;
  mediaType: FeedPostType;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  tags: string[];
  interests?: string[];
  badge?: string;
  time: string;
  location?: string;
  mediaItems?: { uri: string; mediaType: 'photo' | 'video' }[];
  pollOptions?: string[];
  audience?: 'Public' | 'Followers' | 'Private';
  ageRestricted?: boolean;
  allowComments?: boolean;
  allowReuse?: boolean;
  selectedSound?: string;
  shareTo?: string | null;
};

export type FeedSheetAction = {
  label: string;
  detail?: string;
  destructive?: boolean;
};

export type InstitutionType = 'university' | 'polytechnic' | 'college_of_education';

export type Institution = {
  id: string;
  name: string;
  type: InstitutionType;
  category: string;
  location: string;
};

export type EducationStatus = 'currently_in_school' | 'not_in_school_yet' | 'prefer_not_to_say';

export type OnboardingProfile = {
  educationStatus: EducationStatus;
  school: string | null;
  showSchoolOnProfile: boolean;
  displayName: string;
  course: string;
  year: string;
  ageEligibilityConfirmed: boolean;
  interests: string[];
};

export type ProfileRecognition = {
  score: number;
  title: string;
  badges: string[];
};

export type UserProfile = OnboardingProfile & {
  recognition: ProfileRecognition;
};

export type RecognitionMetrics = {
  approvedOriginalPosts: number;
  meaningfulReplies: number;
  uniqueEngagers: number;
  positiveContributions: number;
  gameAchievements: number;
  activeWeeks: number;
};

export type RecognitionTitle = {
  name: string;
  threshold: number;
};

export type LeaderboardCategory = 'overall' | 'creators' | 'contributors' | 'games';

export type LeaderboardEntry = {
  id: string;
  displayName: string;
  title: string;
  score: number;
  category: LeaderboardCategory;
  badge?: string;
};
