-- 0017: hardening found in the backend audit (docs/BACKEND_AUDIT.md).
-- NOT YET RUN against any database: the old Supabase project no longer exists.
-- Review, then run on the new project after 0001-0016.

-- 1. Media size. The bucket allowed 100 MB per file. Photos are re-encoded to roughly 0.3-1 MB
--    and videos are capped at 15 seconds / about 1.5 MB on the client, so 8 MB leaves headroom
--    without letting anyone store huge files. (The client limit is advice; this is the real limit.)
update storage.buckets
set file_size_limit = 8388608
where id = 'post-media';

-- quicktime (.mov) is no longer accepted: the app re-encodes every video to mp4 or webm
-- before upload, so an untouched .mov would be an unprocessed original (metadata intact).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
where id = 'post-media';

-- 2. Usernames: unique and well-formed at the database level, not only in the API.
--    (profiles.username is already unique.) Lower-case only, 3-30 chars of a-z, 0-9, underscore.
--    NOT VALID so existing rows are not blocked; validate after cleaning any old data.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,30}$') not valid;

-- 3. Anonymous IDs: forbid official-looking names in the database too, so the rule cannot be
--    bypassed by calling the function directly. (Edit the list as needed.)
--    TODO when the new project exists: add this check inside register_anonymous_identity.

-- 4. Still open, needs a design decision first (see docs/BACKEND_AUDIT.md, finding 3):
--    "Authenticated users read profiles" lets ANY signed-in session, including anonymous guest
--    sessions, read every profile row directly. Guests need profile reads for Market seller names,
--    so this must become a curated view + route changes, not a one-line policy change.
