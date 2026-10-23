-- Poll votes: atomic recording of user choices on Room poll posts

create table if not exists public.post_poll_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null check (option_index >= 0 and option_index < 10),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists post_poll_votes_post_idx on public.post_poll_votes (post_id);

alter table public.post_poll_votes enable row level security;

create policy "Users read poll votes" on public.post_poll_votes
for select to authenticated using (true);

create policy "Users vote in polls" on public.post_poll_votes
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users change their vote" on public.post_poll_votes
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
