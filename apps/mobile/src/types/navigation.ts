export type MainTab = 'home' | 'create' | 'marketplace' | 'games' | 'anonymous';

export type AuthRoute = 'welcome' | 'sign-up' | 'login' | 'otp' | 'forgot-password';

export type OnboardingRoute = 'school' | 'profile' | 'interests';

export type AppScreen =
  | { kind: 'main' }
  | { kind: 'auth'; route: AuthRoute; displayName?: string }
  | { kind: 'onboarding'; route: OnboardingRoute; displayName?: string }
  | { kind: 'recognition' };

export type TabItem = {
  key: MainTab;
  label: string;
  icon: string;
};
