export type MainTab = 'home' | 'meet' | 'create' | 'anonymous' | 'marketplace';

export type AuthRoute = 'welcome' | 'sign-up' | 'login' | 'otp' | 'forgot-password';

export type OnboardingRoute = 'school' | 'profile' | 'interests';

export type AppScreen =
  | { kind: 'main' }
  | { kind: 'auth'; route: AuthRoute; displayName?: string }
  | { kind: 'onboarding'; route: OnboardingRoute; displayName?: string }
  | { kind: 'status' }
  | { kind: 'meet' }
  | { kind: 'messages'; initialChatUserId?: string; initialChatUserName?: string }
  | { kind: 'notifications' }
  | { kind: 'saved' }
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'admin' }
  | { kind: 'profile'; username?: string };

export type TabItem = {
  key: MainTab;
  label: string;
  icon: string;
};
