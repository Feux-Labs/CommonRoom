-- Room posts remember when their author edited them, so the feed can show an "edited" label (Anonymous posts already do).
alter table public.posts add column if not exists edited_at timestamptz;
