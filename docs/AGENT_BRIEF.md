# Common Room: brief for every feature agent

You are one of several agents building different features **at the same time** in the same repository and the same real Supabase database. Read this whole file, then `docs/PROJECT_STATE.md`, then build only your feature.

## Hard rules (the owner will be angry if you break these)
1. **Never run `git commit`, `git push`, or add "Co-Authored-By" lines.** Do not touch git history at all.
2. **Never read, print, or copy values from any `.env*` file.** Code reads them through `process.env`. You may check that a key exists (`grep -c "^NAME=" file`) but never show a value. If you need a secret that is not there, say so in your report.
3. **No regressions.** Existing behaviour must keep working exactly as before. Before changing a shared file, find everything that depends on it. If a change could break something that works today, don't make it; report it instead.
4. **Stay in your lane.** Create new files for your feature. Only touch an existing shared file when your feature truly needs a hook there, and then use small `Edit` changes (never rewrite or reformat a whole shared file). Re-read the file right before you edit it: other agents may have changed it a minute ago. Never reformat or "clean up" code you were not asked to change.
5. **Real database etiquette.** Everyone shares one real database. Only delete users and rows that *you* created (the helper `cleanup()` does exactly that). Never run a broad `delete from auth.users ...`. Never edit, renumber or delete a migration that already exists. Never drop tables you did not create.
6. **No assumptions.** Read the existing code and the Next.js 16 docs (`apps/web/node_modules/next/dist/docs/`, this is NOT the Next.js you know) before writing. Test against the real database and the real running app, not only mocks.
7. Write clean, production-quality code. No dead code, no TODO stubs presented as done, no fake data in the product.

## Product context (decisions already made by the owner)
- Common Room is an NGL-style anonymous campus social app for Nigerian students. Next.js 16 (App Router, `cacheComponents`), React 19, Supabase (Postgres + Auth), Cloudflare R2 for media, TypeScript. Web app in `apps/web`.
- Bottom nav: Anonymous, Room, Market, Me. Anonymous feed = Hot only, no tabs. Room keeps its existing Threads/X-like design (`components/RoomExperience.tsx`, do not redesign).
- 18+ only. Auto-assigned "Anonymous ID" (e.g. quietfox4821); real profile (name, @username, school) is separate and never leaks into anonymous things.
- Anonymity rule: nothing in the anonymous system may expose who an anonymous author is to other users. Never put author ids in anything a public/other user can read. (The table `anonymous_post_owners` once leaked this; it is locked. Do not recreate that kind of hole.)
- Moderation exists: strikes (`user_restrictions`, `apply_strike`), enforcement in `authenticateRequest`, report queue (`moderation_queue`, `resolve_report`), notifications, rate limits (`consume_rate_limit`).
- Real payments (Paystack/Flutterwave) are NOT connected: no keys yet. Where money is involved, build everything up to the payment call behind a small `PaymentProvider` interface and a clearly-labelled "payments not connected" state. Never fake a successful payment.
- Plain, friendly English in the UI. Nigerian context (₦, schools like AAUA, RUGIPO, UniAbuja).

## Code conventions
- API routes: `apps/web/src/app/api/v1/<name>/route.ts`. Use `authenticateRequest`, `isAuthenticatedRequest`, `apiError`, `apiSuccess`, `parseJson`, `isRecord` from `@/lib/supabase-server`. See `app/api/v1/notifications/route.ts` and `app/api/v1/media/upload-url/route.ts` for the pattern. `rateLimit()` is in `@/lib/rate-limit` (allowed actions are whitelisted in migration 0022; if you need a new action, add a new migration that replaces `consume_rate_limit` with the old list plus yours).
- Database: new migration files in `supabase/migrations/` **using only your reserved number range** (below), named `NNNN_what_it_does.sql`. Make them re-runnable (`if not exists`, `create or replace`, `drop policy if exists`). Every table: `enable row level security`, `revoke all ... from anon, authenticated`, then grant only what is needed plus policies. Server-only tables get no policies. Functions that read protected data: `security definer`, `set search_path = public`, and `revoke ... from public, anon` + explicit `grant execute`. Anything that could unmask an anonymous user must never be readable by the public API roles.
- Apply a migration with `node <scratchpad>/db/apply-one.cjs NNNN_name.sql` (see Tools). **Never** use `apply.cjs`.
- UI: client components in `apps/web/src/features/<feature>/`. Reuse the design system: classes `cr-*` and shared components in `src/components/cr/` (BottomSheet, Toast, FeedStates `StateBlock/ErrorBlock/FeedSkeleton`, Icon, Avatars, primitives). Put your own CSS in a new file `src/styles/<feature>.css` and import it from your feature's entry component (global CSS can be imported from any component in the App Router). Do not edit the big shared CSS files except for a tiny, necessary tweak.
- React 19 lint rules are strict (`react-hooks/set-state-in-effect`, `purity`): load data inside an effect-embedded async IIFE with an `active` flag, derive state instead of syncing it in effects, never call `Date.now()`/`Math.random()` during render. Next 16 cacheComponents: `useSearchParams`/`usePathname` need a Suspense boundary; params in pages are promises.
- Access tokens: client code calls the API with `apiRequest` from `@/features/app/api` and the session from `useAppSession()` (`@/features/app/AppSession`).
- Pages: `apps/web/src/app/<route>/page.tsx`, wrapped in `AppShell` (see `app/settings/page.tsx`). Public pages (viewable signed out) must be added to `PUBLIC_PATHS` in `AppSession.tsx` only if truly needed.
- Types: no `any`. Validate every request body. Never trust the client for ids/ownership: derive the user from the token.

## Reserved migration number ranges (do not use anyone else's)
| Agent | Feature | Numbers |
|---|---|---|
| A1 | Marketplace chat | 0030-0034 |
| A2 | Rooms (communities) | 0035-0039 |
| A3 | People You May Know | 0040-0044 |
| A4 | Analytics + insights | 0045-0049 |
| A5 | Levels, ranks, points | 0050-0054 |
| A6 | Pro (hints / ask-to-reveal) | 0055-0059 |
| A7 | Sponsored ads | 0060-0064 |
| A8 | 30-second onboarding + emails | 0065-0069 |
| A9 | Admin console + feature flags | 0070-0074 |
| A10 | Production hardening | 0075-0079 |
Migrations from different agents may reference tables that already exist (0001-0023). If you need a table another agent is building, don't: define what you need yourself or use only what exists.

## Tools (all paths absolute; this is Windows with Git Bash; use forward slashes)
- Scratchpad: `C:/Users/user/AppData/Local/Temp/claude/bd74922ad64e9d9e/7b43cbbf-8555-47b6-a261-da31ebc22e56/scratchpad` (call it `$SCR`).
- **Your own build output and port** (so you never collide): agent N uses `NEXT_DIST_DIR=.next-aN` and port `320N` (A1 -> `.next-a1`, 3201; A10 -> `.next-a10`, 3210).
  - Build: `cd C:/Users/user/Schoomateapp/apps/web && NEXT_DIST_DIR=.next-aN npx next build`
  - Run: `NEXT_DIST_DIR=.next-aN npx next start -p 320N` (run it in the background; **stop it when you are done**: find the PID with `netstat -ano | grep ":320N " | grep LISTEN`, then `taskkill //PID <pid> //F`).
  - Do NOT run `rm -rf .next` or `.next/types`, and do not touch other agents' `.next-*` folders. Delete your own `.next-aN` folder when finished.
  - Use `localhost`, never an external URL, for the app under test.
- Type check: `cd apps/web && npx tsc --noEmit`. Lint your files: `npx eslint <your files or folders>`. Both must be clean for files you touched. (Other agents' work in progress may cause unrelated errors: ignore errors in files that are not yours, but never leave your own broken.)
- Real-database helpers in `$SCR/db/lib.cjs`: `connect()`, `mkUser(c, "tag", {school, displayName, profile:false})` (confirmed account + profile + signed-in token), `api(base, user, method, path, body)` to call your local app, `rest(user, method, path, body)` to call Supabase REST/RPC as a user (use it to prove row security), `cleanup(c)` (deletes only users you created). Copy the style of `$SCR/db/real-notif.cjs`, `real-mod.cjs`, `real-queue.cjs`, `real-notif-api.cjs`. Name your scripts `$SCR/db/real-<feature>-*.cjs`.
- Apply one migration: `node $SCR/db/apply-one.cjs NNNN_name.sql`.
- Browser tests (Playwright with system Chrome, mocked backend): `$SCR/pw/harness.mjs` (+ `fixtures.mjs`) show how; copy `test-anon.mjs` for the shape. Write your own file `$SCR/pw/test-<feature>.mjs` and run it with `BASE=http://localhost:320N node test-<feature>.mjs` from `$SCR/pw`. Do not edit the shared `test-auth/anon/main.mjs`. The mocked harness injects `api({"GET /api/v1/x": () => [200, {data: ...}]})` overrides.
- Heredocs with many quotes break in this shell: write files with the Write tool, not `cat <<EOF`.
- Windows: no `psql`. To run SQL use a small node script with `lib.cjs`.

## Definition of done
1. Migration(s) applied to the real database and verified: row security proven with `rest()` as a normal user (cannot read others' data, cannot write what they shouldn't).
2. API verified against your running app with real tokens (success paths, bad input, wrong user, signed out).
3. UI built with the design system, mobile-first (390px wide), no horizontal scroll, loading/empty/error states, accessible labels. Verified in the browser (Playwright). If feasible, one unmocked end-to-end run with a real session (see `$SCR/pw/real-e2e.mjs` for how to inject a real session).
4. `tsc` and `eslint` clean for your files; existing tests untouched and not broken (do not run the other suites against your port unless you changed shared code; if you changed shared code, run `$SCR/pw/test-auth.mjs`, `test-anon.mjs`, `test-main.mjs` with `BASE=http://localhost:320N` and report the counts: currently 29, 71, 26 passing).
5. Write `docs/features/<feature>.md` (what it does, API, tables, how to test, known limits). Do NOT edit `docs/PROJECT_STATE.md` (the coordinator does that).
6. Clean up: stop your server, delete `.next-aN`, delete the test users you created.
7. Final report (this is all the coordinator sees): what you built, files created/changed (especially any shared file you edited), migrations applied, test results with numbers, what is NOT done and why, what you need from the owner (keys, decisions).

## Sending notifications (already built, shared)
Insert from a security-definer function or trigger: `insert into public.notifications (user_id, kind, title, link, preview) values (...)`.
Allowed kinds for new features: `market_message`, `room_join`, `room_post`, `rank_up`, `reveal_request`, `reveal_response`, `ad_status`, `restriction`, `system`. `title` is the sentence shown to the person; `link` is an in-app path starting with `/`. Never put an anonymous person's real identity in `actor_id`/`actor_name`. Do not edit the notification table constraints or `NotificationsScreen` (it already renders `title` + `link` for these kinds). Wrap the insert in `begin ... exception when others then null; end;` so a notification failure can never block the real action.
