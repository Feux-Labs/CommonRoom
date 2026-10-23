export type EducationStatus =
  | 'currently_in_school'
  | 'not_in_school_yet'
  | 'prefer_not_to_say';

export type Audience = 'Public' | 'Followers' | 'Private';
export type MediaType = 'photo' | 'video' | 'text' | 'question' | 'poll';

export type MediaItem = {
  uri: string;
  mediaType: 'photo' | 'video';
  poster?: string;
};

export type FeedPost = {
  id: string;
  authorUsername: string;
  authorName: string;
  school: string;
  caption: string;
  mediaUrl: string;
  mediaType: MediaType;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  tags: string[];
  time: string;
  location?: string;
  mediaItems?: MediaItem[];
  pollOptions?: string[];
  pollVotes?: number[];
  userPollVote?: number | null;
  totalPollVotes?: number;
  audience?: Audience;
  ageRestricted?: boolean;
  allowComments?: boolean;
  allowReuse?: boolean;
};

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

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccess<T> = {
  data: T;
};
