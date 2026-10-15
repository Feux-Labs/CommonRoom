'use client';

import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { EducationStatus, OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';

type Step = 'school' | 'profile' | 'interests';
type InstitutionFilter = 'all' | 'university' | 'polytechnic' | 'college_of_education';

const interestOptions = [
  'Campus life',
  'Technology',
  'Music',
  'Sports',
  'Gaming',
  'Entrepreneurship',
  'Arts',
  'Study tips',
];

const educationOptions: { value: EducationStatus; label: string }[] = [
  { value: 'currently_in_school', label: 'Yes' },
  { value: 'not_in_school_yet', label: 'No' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const institutionFilters: { value: InstitutionFilter; label: string; count: number }[] = [
  { value: 'all', label: 'All', count: institutions.length },
  { value: 'university', label: 'Universities', count: institutions.filter((item) => item.type === 'university').length },
  { value: 'polytechnic', label: 'Polytechnics', count: institutions.filter((item) => item.type === 'polytechnic').length },
  { value: 'college_of_education', label: 'Colleges', count: institutions.filter((item) => item.type === 'college_of_education').length },
];

export function OnboardingWizard({
  initialName,
  onComplete,
  onSignOut,
}: {
  initialName: string;
  onComplete: (profile: OnboardingProfile) => Promise<void>;
  onSignOut: () => void;
}) {
  const [step, setStep] = useState<Step>('school');
  const [educationStatus, setEducationStatus] = useState<EducationStatus | null>(null);
  const [school, setSchool] = useState('');
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [manualSchoolEntry, setManualSchoolEntry] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<InstitutionFilter>('all');
  const [displayName, setDisplayName] = useState(initialName);
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredInstitutions = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    return institutions.filter((institution) => {
      const matchesType = institutionFilter === 'all' || institution.type === institutionFilter;
      const searchableText = `${institution.name} ${institution.location} ${institution.category}`.toLowerCase();
      return matchesType && searchableText.includes(query);
    });
  }, [institutionFilter, schoolSearch]);

  function chooseEducationStatus(status: EducationStatus) {
    setEducationStatus(status);
    setError('');
    if (status !== 'currently_in_school') {
      setSchool('');
      setManualSchoolName('');
      setManualSchoolEntry(false);
      setSchoolSearch('');
      setInstitutionFilter('all');
    }
  }

  function continueFromSchool() {
    if (!educationStatus || (educationStatus === 'currently_in_school' && !school && !manualSchoolName.trim())) {
      setError('Choose your education status and select or enter your school if you are currently studying.');
      return;
    }
    setError('');
    setStep('profile');
  }

  function continueFromProfile() {
    if (!displayName.trim()) {
      setError('Enter a display name.');
      return;
    }
    if (!ageConfirmed) {
      setError('Confirm that you meet the app’s age eligibility requirement.');
      return;
    }
    setError('');
    setStep('interests');
  }

  async function finishOnboarding() {
    if (!educationStatus) {
      setError('Go back and choose your education status.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onComplete({
        educationStatus,
        school: educationStatus === 'currently_in_school' ? manualSchoolName.trim() || school || null : null,
        showSchoolOnProfile: false,
        displayName: displayName.trim(),
        course: educationStatus === 'currently_in_school' ? course.trim() : '',
        year: educationStatus === 'currently_in_school' ? year.trim() : '',
        ageEligibilityConfirmed: ageConfirmed,
        interests,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(interest: string) {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  }

  const stepNumber = step === 'school' ? 1 : step === 'profile' ? 2 : 3;
  const selectedSchool = manualSchoolName.trim() || school;

  return (
    <section aria-labelledby="onboarding-title" className={`onboarding-wizard onboarding-wizard-${step}`}>

      {step === 'school' ? (
        <div className="onboarding-school-screen">
          <header className="onboarding-selector-topbar">
            <button aria-label="Back to sign in" className="onboarding-back" onClick={onSignOut} type="button"><ChevronLeft size={17} /></button>
            <span className="onboarding-progress">ACCOUNT SETUP · 1 OF 3</span>
            <button className="onboarding-exit" onClick={onSignOut} type="button">Exit</button>
          </header>
          <h1 id="onboarding-title">Are you a student?</h1>
          <p className="onboarding-subtitle">Your answer helps tailor your in-app experience.</p>
          <div aria-label="Education status" className="onboarding-education-options" role="radiogroup">
            {educationOptions.map((option) => (
              <button
                aria-checked={educationStatus === option.value}
                className={educationStatus === option.value ? 'onboarding-education-option selected' : 'onboarding-education-option'}
                key={option.value}
                onClick={() => chooseEducationStatus(option.value)}
                role="radio"
                type="button"
              >
                <span className="onboarding-option-label">{option.label}</span>
                <span aria-hidden="true" className={educationStatus === option.value ? 'onboarding-radio selected' : 'onboarding-radio'} />
              </button>
            ))}
          </div>

          {educationStatus === 'currently_in_school' ? (
            <div className="onboarding-school-picker">
              <label className="onboarding-field-label" htmlFor="onboarding-school-search">Select your school</label>
              <div className="onboarding-school-search">
                <span aria-hidden="true" className="onboarding-search-glyph">⌕</span>
                <input
                  autoComplete="off"
                  id="onboarding-school-search"
                  onChange={(event) => { setSchoolSearch(event.target.value); setSchool(''); setManualSchoolName(''); }}
                  placeholder="Search for your school"
                  value={schoolSearch}
                />
                {schoolSearch ? <button aria-label="Clear search" onClick={() => setSchoolSearch('')} type="button">×</button> : null}
              </div>
              <div aria-label="Filter institutions by type" className="onboarding-school-filters">
                {institutionFilters.map((filter) => (
                  <button
                    aria-pressed={institutionFilter === filter.value}
                    className={institutionFilter === filter.value ? 'selected' : ''}
                    key={filter.value}
                    onClick={() => setInstitutionFilter(filter.value)}
                    type="button"
                  >
                    {filter.label} <span>{filter.count}</span>
                  </button>
                ))}
              </div>
              <p className="onboarding-result-count">{filteredInstitutions.length} {filteredInstitutions.length === 1 ? 'institution' : 'institutions'}</p>
              <div aria-label="Nigerian institutions" className="onboarding-institution-list" role="radiogroup">
                {filteredInstitutions.length ? filteredInstitutions.map((institution) => (
                  <button
                    aria-checked={school === institution.name}
                    className={school === institution.name ? 'onboarding-institution selected' : 'onboarding-institution'}
                    key={institution.id}
                    onClick={() => { setSchool(institution.name); setManualSchoolName(''); setManualSchoolEntry(false); }}
                    role="radio"
                    type="button"
                  >
                    <span aria-hidden="true" className="onboarding-institution-monogram">{institution.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                    <span className="onboarding-institution-copy"><strong>{institution.name}</strong><small>{institution.location} · {institution.category}</small></span>
                    <span aria-hidden="true" className={school === institution.name ? 'onboarding-radio selected' : 'onboarding-radio'} />
                  </button>
                )) : <p className="onboarding-no-results">No schools found. Try another name, location, or school type.</p>}
              </div>
              <button className="onboarding-manual-toggle" onClick={() => { setManualSchoolEntry((current) => !current); setManualSchoolName(''); setSchool(''); }} type="button">
                {manualSchoolEntry ? 'Choose from the list instead' : "Can’t find your school? Type it in"}
              </button>
              {manualSchoolEntry ? (
                <label className="onboarding-manual-field">
                  <span className="onboarding-field-label">Enter your school name</span>
                  <input maxLength={160} onChange={(event) => { setManualSchoolName(event.target.value); setSchool(''); }} placeholder="Type your school name" value={manualSchoolName} />
                </label>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
          <div className="onboarding-selector-footer">
            <p className="onboarding-selection-summary">{selectedSchool}</p>
            <button className="onboarding-native-button" disabled={!educationStatus || (educationStatus === 'currently_in_school' && !selectedSchool)} onClick={continueFromSchool} type="button">Continue</button>
          </div>
        </div>
      ) : null}

      {step === 'profile' ? (
        <div className="onboarding-content">
          <header className="onboarding-content-top">
            <button className="onboarding-exit-button" onClick={onSignOut} type="button">Exit</button>
            <span className="brand-wordmark" style={{ fontSize: 24 }}>Commonroom</span>
          </header>
          <p className="onboarding-progress">ACCOUNT SETUP · {stepNumber} OF 3</p>
          <h1 id="onboarding-title">Set up your profile</h1>
          <p className="onboarding-subtitle">Complete your profile to personalize your community.</p>
          {selectedSchool ? <p className="onboarding-school-summary">School: {selectedSchool}</p> : null}
          <div className="onboarding-fields">
            <label className="onboarding-field">
              <span>Display name</span>
              <input autoComplete="name" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="What should people call you?" value={displayName} />
            </label>
            {educationStatus === 'currently_in_school' ? (
              <div className="form-grid">
                <label className="onboarding-field"><span>Course (optional)</span><input maxLength={80} onChange={(event) => setCourse(event.target.value)} placeholder="Course of study" value={course} /></label>
                <label className="onboarding-field"><span>Year of study (optional)</span><input maxLength={40} onChange={(event) => setYear(event.target.value)} placeholder="e.g. 200 level" value={year} /></label>
              </div>
            ) : null}
            <div>
              <label className="onboarding-age-confirm">
                <input checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} type="checkbox" />
                <span>I confirm that I meet the app’s minimum age requirement.</span>
              </label>
            </div>
          </div>
          {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
          <button className="onboarding-native-button" onClick={continueFromProfile} type="button">Continue</button>
          <button className="onboarding-text-button" onClick={() => { setError(''); setStep('school'); }} type="button">Back to education status</button>
        </div>
      ) : null}

      {step === 'interests' ? (
        <div className="onboarding-content">
          <header className="onboarding-content-top">
            <button className="onboarding-exit-button" onClick={onSignOut} type="button">Exit</button>
            <span className="brand-wordmark" style={{ fontSize: 24 }}>Commonroom</span>
          </header>
          <p className="onboarding-progress">ACCOUNT SETUP · {stepNumber} OF 3</p>
          <h1 id="onboarding-title">Choose your interests</h1>
          <p className="onboarding-subtitle">Pick any that sound interesting, or skip to finish setup.</p>
          <div aria-label="Choose your interests" className="onboarding-interests">
            {interestOptions.map((interest) => (
              <button
                aria-pressed={interests.includes(interest)}
                className={interests.includes(interest) ? 'selected' : ''}
                key={interest}
                onClick={() => toggleInterest(interest)}
                type="button"
              >
                {interest}
              </button>
            ))}
          </div>
          {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
          <button className="onboarding-native-button" disabled={saving} onClick={() => void finishOnboarding()} type="button">
            {saving ? 'Saving your profile…' : 'Finish setup'}
          </button>
          <button className="onboarding-text-button" disabled={saving} onClick={() => { setError(''); setStep('profile'); }} type="button">Back to profile</button>
        </div>
      ) : null}
    </section>
  );
}
