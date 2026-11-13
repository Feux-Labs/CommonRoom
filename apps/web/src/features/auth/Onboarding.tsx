'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { Banner, DotsProgress, Input } from '@/components/cr/primitives';
import { Icon } from '@/components/cr/Icon';
import type { Gender, OnboardingProfile } from '@/lib/contracts';
import { institutions } from '@/lib/institutions';

export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

type Step = 'student' | 'school' | 'photo';
type StudentAnswer = 'yes' | 'no' | 'skip';

/** Returns an error message, or null when the file can be used as a profile photo. */
export function profilePhotoProblem(file: File): string | null {
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) return 'Use a JPG or PNG photo.';
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return 'Choose a photo up to 5 MB.';
  return null;
}

/**
 * Short steps after sign-up: "Are you a student?" (yes goes on to pick a school; no or skip leaves school out), then an optional photo.
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
  const [step, setStep] = useState<Step>('student');
  const [student, setStudent] = useState<StudentAnswer | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
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

  // School details only count when the person said they are a student.
  const schoolChosen = student === 'yes' ? school : '';

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
        gender: gender ?? 'prefer_not_to_say',
        educationStatus: student === 'yes' ? 'currently_in_school' : student === 'no' ? 'not_in_school_yet' : 'prefer_not_to_say',
        school: schoolChosen || null,
        showSchoolOnProfile: Boolean(schoolChosen),
        displayName: displayName.trim(),
        course: schoolChosen ? course.trim() : '',
        year: schoolChosen ? year.trim() : '',
        ageEligibilityConfirmed: true,
        interests: [],
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

  if (step === 'student') {
    const choose = (answer: StudentAnswer) => {
      if (needsName && !displayName.trim()) {
        setError('Enter your name.');
        return;
      }
      setError('');
      setStudent(answer);
      setStep(answer === 'yes' ? 'school' : 'photo');
    };
    return (
      <Surface>
        <div className="cr-auth__brand-row" style={{ marginBottom: 8 }}>
          <DotsProgress current={1} total={3} />
          <button className="cr-auth__link" onClick={onSignOut} type="button">Sign out</button>
        </div>
        {heading('Add your school?', 'Optional. It helps show you posts from your school. You can skip it.')}
        <div className="cr-auth__form" style={{ flex: 1 }}>
          {needsName ? (
            <Input inputProps={{ autoComplete: 'name', maxLength: 80, required: true }} label="Full name" onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" value={displayName} />
          ) : null}
          <p className="cr-auth__ask">I am</p>
          <div aria-label="I am" className="cr-auth__chips" role="group">
            {([['female', 'Female'], ['male', 'Male'], ['prefer_not_to_say', 'Prefer not to say']] as const).map(([value, label]) => (
              <button aria-pressed={gender === value} key={value} onClick={() => setGender(value)} type="button">{label}</button>
            ))}
          </div>
          {error ? <p className="msg e" role="alert">{error}</p> : null}
          <button className="cr-auth__btn cr-auth__btn--push" onClick={() => choose('yes')} type="button">Yes, add my school</button>
          <button className="ghost" onClick={() => choose('no')} type="button">No</button>
          <p className="cr-auth__center">
            <button className="cr-auth__link" onClick={() => choose('skip')} type="button">Skip for now</button>
          </p>
        </div>
      </Surface>
    );
  }

  if (step === 'school') {
    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');
      setStep('photo');
    };
    return (
      <Surface>
        <BackButton onClick={() => setStep('student')} />
        <DotsProgress current={2} total={3} />
        {heading('Which school?', 'Pick your school. You can skip this too.')}
        <form className="cr-auth__form" noValidate onSubmit={submit} style={{ flex: 1 }}>
          <SchoolPicker onQueryChange={setSchoolQuery} onSelect={setSchool} query={schoolQuery} selected={school} />
          <Input inputProps={{ maxLength: 80, disabled: !school }} label="Department" onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Computer Science" value={course} />
          <Input inputProps={{ maxLength: 40, disabled: !school }} label="Level" onChange={(event) => setYear(event.target.value)} placeholder="e.g. 300L" value={year} />
          <p className="msg">Shown on your profile. You can hide it in Privacy settings.</p>
          {error ? <p className="msg e" role="alert">{error}</p> : null}
          <button className="cr-auth__btn cr-auth__btn--push" disabled={!school} type="submit">Continue</button>
          <p className="cr-auth__center">
            <button className="cr-auth__link" onClick={() => { setSchool(''); setSchoolQuery(''); setCourse(''); setYear(''); setError(''); setStep('photo'); }} type="button">Skip for now</button>
          </p>
        </form>
      </Surface>
    );
  }

  return (
    <Surface>
      <BackButton onClick={() => setStep(student === 'yes' ? 'school' : 'student')} />
      <DotsProgress current={3} total={3} />
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
