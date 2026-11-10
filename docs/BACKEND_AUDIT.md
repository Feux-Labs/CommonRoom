# Backend and existing-code audit

Date: 2026-11-09. Scope: the API routes in `apps/web/src/app/api/v1`, the SQL in `supabase/migrations/0001` to `0016`, and the browser media code. Method: read the code and SQL, then prove the risky claims with a test where a test was possible.

**Limit of this audit:** no real database was available (the old Supabase project no longer exists), so SQL behaviour was read, not run. Everything marked "verified" below was verified by running code in a browser or in Node. Run the migrations on the new project and repeat the security checks there before launch.

## What is already sound

| Check | Evidence |
|---|---|
| Direct access to the anonymous tables is blocked | `0002_anonymous_feed_inbox.sql` lines 107-116 `revoke all ... from anon, authenticated` on every anonymous table. The permissive `using (true)` policy in `0001` is neutralised by this. Anonymous data is reachable only through the security-definer functions. |
| API tokens are checked on the server | `lib/supabase-server.ts` calls `auth.getUser(token)` (asks Supabase), it does not trust a decoded JWT. |
| Inbox senders are never returned | `participant_label` is always "Anonymous"; the sender id lives in a table the client cannot read. |
| Row Level Security is on for the core tables | `0001_core.sql` lines 126-134, plus later migrations for rooms, saves, polls. |
| Cursor paging input is validated | `decodeCursor` in the anonymous posts route; UUID pattern check. |
| People search escapes its input | `people/route.ts` strips `% _ , ( )` before building the filter. |

## Fixed in this pass (each tested)

| # | Severity | Problem | Fix |
|---|---|---|---|
| F1 | **High** | **Photos could be uploaded with GPS and camera data intact.** `compressImage` returned the original file whenever the re-encoded copy was not smaller. Reproduced: a GPS-tagged JPEG came back byte-identical, with EXIF and camera make present. | Never return the original. Always re-encode (WebP, JPEG fallback), which drops all metadata. Verified on three test photos: no EXIF, no camera data, original never returned. |
| F2 | High | Video fell back to the untouched original (metadata intact) when recording was unsupported, and recorded at 2 Mbps (a 15 s clip is about 3.7 MB). | 15 s cap, about 1.5 MB target, refuses files it cannot process instead of uploading the original. Also handles browser-recorded video that reports an infinite duration (this would have broken edited reels). Verified: 20 s clip refused, 12 s clip becomes a 0.5 MB mp4. |
| F3 | High | **Profile saves could report success while saving nothing.** On any database error the route "fell back" to auth metadata and returned 200. A username collision therefore created an account with no profile row, and every feature that needs one (posts, comments) then failed. | Removed the fallback. Real errors now return an error. A taken username is retried with a numeric suffix. |
| F4 | High | **Usernames were trusted from client-controlled sign-up metadata**: no format check, no reserved names ("admin", "support"), no availability check. | `lib/username.ts` rules shared by client and server; `GET /api/v1/username/check`; the sign-up screen shows "available / taken" before creating the account. Unit-tested. |
| F5 | High | **Posts, avatars and listings accepted any image URL.** An attacker URL is a tracking pixel for every viewer, or hotlinked illegal content we appear to host. Listing images were not validated at all. | Only this project's own storage URLs are accepted (`lib/media-url.ts`). Unit-tested against 9 attack URLs including look-alike hosts and path tricks. |
| F6 | Medium | Listing fields were unvalidated (any category, any size of text, `Infinity` as price). A seller could also PUT `status: "available"` on a listing a moderator had removed. | `lib/listing-validation.ts` applied to create and update. Sellers can only set available, sold or unavailable and cannot touch a removed listing. Unit-tested. |
| F7 | Low | The sell form allowed an empty description but the API requires 5 characters, so a valid-looking form always failed. | Form now requires 5 characters. |

## Open (needs a decision, infrastructure or the real database)

| # | Severity | Finding | Recommended fix |
|---|---|---|---|
| O1 | **High** | **Every signed-in session, including anonymous guest sessions, can read every profile row directly** (`0008_room.sql` line 82: `Authenticated users read profiles using (true)`). Guest sessions are free to create, so anyone can scrape all names, schools, courses, years, interests. The "show my school" setting is only applied in the API, so reading the table directly bypasses it. | A curated `public_profiles` view that honours privacy settings, direct table reads limited to the owner, and the routes that join profiles (Market seller, people, posts) pointed at the view. Not a one-line change because guests need seller names in Market. |
| O2 | **High** | **Anonymous message links can be spammed.** The inbox limit is 10 messages per hour per user id, but guest accounts cost nothing, so one person can create unlimited guests. | Turn on CAPTCHA for anonymous sign-ins in Supabase, add a per-link hourly cap and a per-IP limit at the edge. |
| O3 | High | No rate limiting on Room posts, comments, likes or follows. Only the anonymous functions have limits. | Per-account limits (Upstash Redis is already a dependency) or a database function like the anonymous one. |
| O4 | Medium | The admin gate compares the email against **one Gmail address hard-coded in `lib/admin-auth.ts`**. It also requires a confirmed email, which protects it today. The `ADMIN_EMAIL` env variable exists but is not used. | Replace with an admin roles table and two-factor login in the new admin app (plan phase 5). |
| O5 | Medium | Anonymous IDs are checked only for length and characters in the database. No reserved-word or offensive-word filter server-side. | Add it inside `register_anonymous_identity` (note in `0017`). The client check is a convenience, not protection. |
| O6 | Medium | Photo location data is stripped in the browser only. A person who uploads directly (skipping the app) can still upload their own tagged original. That exposes only themselves, but moderators could then see raw files. | Optional server-side re-encode step later. Not urgent. |
| O7 | Low | Two schemas: `prisma/schema.prisma` and the SQL migrations. Risk of drift. | Choose the SQL migrations as the only source of truth and remove or generate the Prisma model. |
| O8 | Low | No automated tests in the repo; the Playwright and unit scripts used here live outside it. | Move them into `apps/web/e2e` and `apps/web/tests` when you approve adding dev dependencies. |

## Migration `0017_security_hardening.sql`
Not run anywhere yet. It tightens the storage bucket to 8 MB and drops `.mov`, and adds a username format check. The profile-read fix (O1) is described in the file, not applied, because it needs the route changes above.
