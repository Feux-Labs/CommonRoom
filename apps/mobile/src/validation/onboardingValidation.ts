import { OnboardingProfile } from '../types/domain';

export function validateOnboardingProfile(profile: Pick<OnboardingProfile, 'displayName' | 'ageEligibilityConfirmed'>) {
  if (!profile.displayName.trim()) {
    return 'Enter a display name.';
  }

  if (!profile.ageEligibilityConfirmed) {
    return 'Confirm that you meet the app’s age eligibility requirement.';
  }

  return null;
}
