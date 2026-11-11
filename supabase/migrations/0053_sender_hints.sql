-- Sender-chosen hints: when someone messages an inbox link they can choose to add true facts about themselves (their school,
-- year or course). Only the link owner can see them, and only with Pro. Nothing is ever revealed that the sender did not pick.
alter table public.anonymous_inbox_threads add column if not exists sender_hints jsonb not null default '{}'::jsonb;
