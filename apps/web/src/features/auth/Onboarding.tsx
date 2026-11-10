'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { Banner, Chip, DotsProgress, Input } from '@/components/cr/primitives';
import { Icon } from '@/components/cr/Icon';
import type { OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';

export const ONBOARDING_INTERESTS = [
  'Study tips', 'Tech', 'Campus life', 'Career', 'Music', 'Sports',
  'Comedy', 'Fashion', 'Food', 'Faith', 'Business', 'Gaming',
] as const;

const MIN_INTERESTS = 3;
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

type Step = 'interests' | 'school' | 'photo';

/** Returns an error message, or null when the file can be used as a profile photo. */
export function profilePhotoProblem(file: File): string | null {
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) return 'Use a JPG or PNG photo.';
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return 'Choose a photo up to 5 MB.';
  return null;
}

/**
 * Screens 5–7: interests (at least three), optional school, optional photo.
 * Saves once at the end through onComplete so a half-finished profile is never stored.
 */
export function Onboarding({
  initialName,
  ageConfirmed,
  onComplete,
  onSignOut,
}: {
  initialName: string;
  /** Whether the age confirmation was already captured at sign up. */
  ageConfirmed: boolean;
  onComplete: (profile: OnboardingProfile, avatarFile: File | null) => Promise<void>;
  onSignOut: () => void;
}) {
  const [step, setStep] = useState<Step>('interests');
  const [interests, setInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState(initialName);
  const [school, setSchool] = useState('');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [ageChecked, setAgeChecked] = useState(ageConfirmed);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : null), [avatarFile]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const needsName = !initialName.trim();

  const toggleInterest = (interest: string) => {
    setInterests((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));
  };

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    const problem = profilePhotoProblem(file);
    if (problem) {
      setAvatarError(problem);
      return;
    }
    setAvatarError('');
    setAvatarFile(file);
  };

  const finish = async (withPhoto: boolean) => {
    if (needsName && !displayName.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!ageChecked) {
      setError('Confirm that you are 18 or older.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onComplete({
        educationStatus: school ? 'currently_in_school' : 'prefer_not_to_say',
        school: school || null,
        showSchoolOnProfile: Boolean(school),
        displayName: displayName.trim(),
        course: school ? course.trim() : '',
        year: school ? year.trim() : '',
        ageEligibilityConfirmed: true,
        interests,
      }, withPhoto ? avatarFile : null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your profile could not be saved. Try again.');
      setSaving(false);
    }
  };

  const heading = (title: string, sub: string) => (
    <>
      <h1 className="cr-auth__title" ref={headingRef} tabIndex={-1}>{title}</h1>
      <p className="cr-auth__sub">{sub}</p>
    </>
  );

  if (step === 'interests') {
    return (
      <Surface>
        <div className="cr-auth__brand-row" style={{ marginBottom: 8 }}>
          <DotsProgress current={1} />
          <button className="cr-auth__link" onClick={onSignOut} type="button">Sign out</button>
        </div>
        {heading('What are you into?', `Pick at least ${MIN_INTERESTS}. This shapes your feed.`)}
        <div className="cr-onboard__chips" role="group" aria-label="Interests">
          {ONBOARDING_INTERESTS.map((interest) => (
            <Chip active={interests.includes(interest)} key={interest} label={interest} onClick={() => toggleInterest(interest)} />
          ))}
        </div>
        <p className="cr-onboard__count" aria-live="polite">
          {interests.length < MIN_INTERESTS ? `${MIN_INTERESTS - interests.length} more to go` : `${interests.length} selected`}
        </p>
        <button className="cr-auth__btn cr-auth__btn--push" disabled={interests.length < MIN_INTERESTS} onClick={() => setStep('school')} type="button">
          Continue
        </button>
      </Surface>
    );
  }

  if (step === 'school') {
    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (needsName && !displayName.trim()) {
        setError('Enter your name.');
        return;
      }
      setError('');
      setStep('photo');
    };
    return (
      <Surface>
        <BackButton onClick={() => setStep('interests')} />
        <DotsProgress current={2} />
        {heading('Where do you study?', 'Optional. Skip if you are not in school.')}
        <form className="cr-auth__form" noValidate onSubmit={submit} style={{ flex: 1 }}>
          {needsName ? (
            <Input inputProps={{ autoComplete: 'name', maxLength: 80, required: true }} label="Full name" onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" value={displayName} />
          ) : null}
          <SchoolPicker onQueryChange={setSchoolQuery} onSelect={setSchool} query={schoolQuery} selected={school} />
          <Input inputProps={{ maxLength: 80, disabled: !school }} label="Department" onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Computer Science" value={course} />
          <Input inputProps={{ maxLength: 40, disabled: !school }} label="Level" onChange={(event) => setYear(event.target.value)} placeholder="e.g. 300L" value={year} />
          <p className="msg">Shown on your profile. You can hide it in Privacy settings.</p>
          {error ? <p className="msg e" role="alert">{error}</p> : null}
          <button className="cr-auth__btn cr-auth__btn--push" disabled={!school} type="submit">Continue</button>
          <p className="cr-auth__center">
            <button className="cr-auth__link" onClick={() => { setSchool(''); setSchoolQuery(''); setCourse(''); setYear(''); if (needsName && !displayName.trim()) { setError('Enter your name.'); return; } setError(''); setStep('photo'); }} type="button">Skip for now</button>
          </p>
        </form>
      </Surface>
    );
  }

  return (
    <Surface>
      <BackButton onClick={() => setStep('school')} />
      <DotsProgress current={3} />
      {heading('Add a photo', 'Helps people recognise you. JPG or PNG, up to 5 MB.')}
      <input
        accept={PROFILE_PHOTO_TYPES.join(',')}
        className="cr-visually-hidden"
        onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.target.value = ''; }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />
      <button
        aria-label={avatarFile ? 'Change photo' : 'Choose photo'}
        className={avatarFile ? 'cr-onboard__avatar has-photo' : 'cr-onboard__avatar'}
        onClick={() => fileInput.current?.click()}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        {avatarPreview ? <img alt="" src={avatarPreview} /> : <Icon name="plus" />}
      </button>
      <div className="cr-onboard__photo-actions">
        <button className="ghost" onClick={() => fileInput.current?.click()} type="button">{avatarFile ? 'Change photo' : 'Choose photo'}</button>
        {avatarFile ? <button className="ghost" onClick={() => setAvatarFile(null)} type="button">Remove</button> : null}
      </div>
      {avatarError ? <p className="msg e" role="alert" style={{ textAlign: 'center' }}>{avatarError}</p> : null}
      {!ageConfirmed ? (
        <label className="cr-auth__check">
          <input checked={ageChecked} onChange={(event) => setAgeChecked(event.target.checked)} type="checkbox" />
          <span>I am 18 or older.</span>
        </label>
      ) : null}
      {error ? <Banner style={{ marginTop: 12 }}>{error}</Banner> : null}
      <button aria-busy={saving || undefined} className="cr-auth__btn cr-auth__btn--push" disabled={saving || !avatarFile || !ageChecked} onClick={() => void finish(true)} type="button">
        {saving ? <span aria-hidden="true" className="cr-auth__spinner" /> : null}
        Finish
      </button>
      <p className="cr-auth__center">
        <button className="cr-auth__link" disabled={saving || !ageChecked} onClick={() => void finish(false)} type="button">Skip for now</button>
      </p>
    </Surface>
  );
}

function Surface({ children }: { children: ReactNode }) {
  return (
    <div className="cr-auth" role="dialog" aria-modal="true" aria-label="Set up your profile">
      <div className="cr-auth__panel">{children}</div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Back" className="cr-auth__back" onClick={onClick} type="button">
      <Icon name="back" />
    </button>
  );
}

/** Searchable list of Nigerian institutions, keyboard accessible (combobox pattern). */
function SchoolPicker({
  query,
  selected,
  onQueryChange,
  onSelect,
}: {
  query: string;
  selected: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputId = useId();

  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return institutions.slice(0, 30);
    return institutions.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(value)).slice(0, 30);
  }, [query]);

  const choose = (name: string) => {
    onSelect(name);
    onQueryChange(name);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && matches[active]) {
      event.preventDefault();
      choose(matches[active].name);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="cr-field cr-onboard__school">
      <label htmlFor={inputId}>School</label>
      <div className={selected ? 'cr-input v' : 'cr-input'}>
        <input
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          id={inputId}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => { onQueryChange(event.target.value); onSelect(''); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search your school"
          role="combobox"
          value={query}
        />
        <Icon name="chv" />
      </div>
      {open ? (
        <ul className="cr-onboard__options" id={listId} role="listbox">
          {matches.length ? matches.map((item, index) => (
            <li key={item.id} role="presentation">
              <button
                aria-selected={index === active}
                className="cr-onboard__option"
                id={`${listId}-${index}`}
                onMouseDown={(event) => { event.preventDefault(); choose(item.name); }}
                role="option"
                tabIndex={-1}
                type="button"
              >
                {item.name}
                <small>{item.location}</small>
              </button>
            </li>
          )) : <li className="cr-onboard__option" role="presentation">No schools match “{query.trim()}”.</li>}
        </ul>
      ) : null}
    </div>
  );
}
