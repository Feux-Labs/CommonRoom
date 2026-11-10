-- "You're back" emails: remember how many times sending was tried, so one bad address can't be retried forever.
alter table public.user_restrictions add column if not exists notify_attempts integer not null default 0;
