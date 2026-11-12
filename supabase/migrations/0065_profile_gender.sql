-- Gender is asked at sign-up (male, female or prefer not to say) and picks which character is shown on the profile. Optional.
alter table public.profiles add column if not exists gender text check (gender in ('male', 'female', 'prefer_not_to_say'));
