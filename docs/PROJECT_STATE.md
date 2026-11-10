# Common Room: project state and decisions

Last updated: 2026-11-10. Read this first, then `docs/PRODUCT_PLAN_V1.md` (long reference) and the illustrated plan page https://claude.ai/artifact/CL56tYUCmfb1rJTrsaQVHv (local copy `docs/PRODUCT_PLAN.html`, served at http://127.0.0.1:4100/PRODUCT_PLAN.html while the docs server runs).

Rules that always apply:
- **Never run `git commit` or `git push`, never add "Co-Authored-By" lines.** All work is uncommitted in the working tree.
- Read the Next.js docs in `apps/web/node_modules/next/dist/docs/` before changing routing or caching (Next 16, `cacheComponents`: `params`, `searchParams` and clock reads must not happen during prerender).
- Research before building. Do not assume. Existing code is vetted, not trusted.

## 1. Phase 0 report

**Built (apps/web):** auth (email + code, Google native, Apple switch), onboarding, session/guest provider, Anonymous feed + comments + report + share + delete, Inbox, private thread, public message page (6 states), composer (Room post, anonymous post, poll, drafts, gradient text cards, 15 s video check), Market (browse, filters, location, saved, detail, owner view, sell/edit), profile, edit profile, other profiles + follow, settings, search, notifications placeholder, shared sheets/toasts/states. Room keeps its existing component (`components/RoomExperience.tsx`) at `/room`.

**Routes:** `/` redirects to `/anonymous`. Tabs: Anonymous, Room, Market, Me. Old `?tab=` URLs redirect.

**Removed (nothing imported them):** old `AnonymousExperience`, `MarketplaceExperience`, `ProfileExperience`, `OnboardingWizard`, `MeetExperience`, `GamesExperience`, `PuzzleRetentionExperience`, `MediaUploadQueue`, `cr/screens/*`, `app/dev`, `app/screens`, `app/nav`, `app/games-preview`, `locationService`, `commonroom.css`, two stray design HTML files. Kept on purpose: `CommunityAnnouncement` (admin announcements will need it), the games/dating API routes (backend untouched), `app/admin` (rebuilt in phase 5).

**Verified:** `next build` passes (it caught three problems dev mode hid: render-time clock reads and `usePathname` in the root provider). Browser suites on the PRODUCTION server: auth 29, anonymous/composer 39, main 26 checks, 0 failures. Unit tests: 12 pass (IDs, usernames, listing rules, media URLs). Compression: GPS removal proven on 3 photos, 20 s video refused, 12 s clip becomes 0.5 MB. ESLint: 0 errors (37 warnings, mostly pre-existing unused code in Room and `<img>` tags).

**Not verified:** everything above ran against a MOCKED API. No real database exists (the old Supabase project is gone). RLS, storage, email codes and rate limits are untested for real.

**Left for phase 0 (needs the user):** create a Supabase project; I run migrations `0001` to `0017`; set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, ZeptoMail SMTP, `NEXT_PUBLIC_SUPPORT_EMAIL`; deploy a preview.

**Not built yet:** delaying the email code until posting (needs a Supabase setting), forced-interests removal (the step is still required to pick 3), share cards, rate limits, moderation, analytics, Rooms, People You May Know, Pro/levels, ads, admin app, Market chat, notifications.

**Test scripts live in the session scratchpad, not the repo** (`pw/test-*.mjs`, `unit.mjs`, `pw/test-compress.mjs`). Move them into the repo when the user approves adding dev dependencies.

## 2. Decisions log

| # | Decision | Status |
|---|---|---|
| D1 | Keep Supabase Auth (custom JWT port was considered and dropped because native Google sign-in fixes the "supabase.co" consent screen). | Final |
| D2 | Google sign-in via Google Identity Services + `signInWithIdToken`. | Built; needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the same client ID in Supabase |
| D3 | ZeptoMail is the email provider, set as Supabase custom SMTP. Email template must contain `{{ .Token }}` for 6-digit codes. | To configure |
| D4 | TikTok sign-in via our own server route that creates a Supabase user. TikTok gives no email. | Planned |
| D5 | Instagram sign-in **removed** (business/creator accounts only). Sign-in options are **email + password (built), Google, TikTok, Apple**. | Final (user, 2026-11-09) |
| D6 | Light theme only. | Done |
| D9 | Room is where everything meets; Anonymous is its own tab; Marketplace stays and needs real profiles. **Room keeps its existing design** (Threads/X-like, text first) and gets an always-visible "+" button; there is no separate Home. | Current |
| D10 | Age gate copy becomes "I am 18 or older". | To do |
| D11 | Anonymous feed viewable by anyone with the link without login; commenting needs a Ghost name (Ghost 12, Ghost 56); Room actions need a real account. | Current |
| D12 | Admin moves to a separate codebase at `admin.<domain>`. | Planned |
| D13 | Ads: self-serve, tagged "Sponsored", about 1 ad per 7 to 15 organic posts, tiers by weekly price, "pay 3 weeks get 4" option in admin. | Planned |
| D14 | Moderation from day one: strikes 3 days, 7 days, then ban + device. | Planned |
| D15 | **Pro tier.** User wants paying users to "see who sent them a message or a few info about them". Verified risk: the FTC and LA DA acted against NGL Labs for fake messages and for claiming a paid subscription revealed senders (only vague hints were given). **Recommended and planned instead:** sender-chosen opt-in hints, "ask the sender to reveal" (sender can accept/ignore), message insights, unlimited links/themes, Pro badge, 2x level points, Ultimate Pass, ad-free. Never unmask without sender consent, never fake messages, clear recurring pricing. | **Agreed by user 2026-11-09** (price and ad-free still open) |
| D16 | **Levels = 5 phases with ranks nested inside (3 steps per rank, 20 ranks):** Rookie (Novice, Amateur, Regular) > Ultimate (Chief, Prodigy, Senator, Sensei, Shifu, Doctore) > Legend (Hero, Champion, Paragon, Legend) > Immortal (Awakening, Immortal) > Sages and Gods (Sage, Great Sage, God, True God, Ancient God). Commoner removed; Baby Immortal renamed Awakening; "Pro" rank renamed Prodigy. Pace: Doctore ~3 months (power user) to ~10 months (casual); Ancient God ~2 to 5+ years; everyone can SEE the summit (rank gallery, Glimpse, Hall of Fame). Pro: 2x points up to Doctore + Ultimate Pass (start at Chief). Top-rank order is my proposal; awaiting confirmation. | Mostly agreed |
| D17 | Visual review page published as an Artifact (supersedes the markdown plan for reading): https://claude.ai/artifact/CL56tYUCmfb1rJTrsaQVHv . Source file is in the session scratchpad as `common-room-plan.html`; republish to the same URL to update. Standalone copy for the VS Code browser: `docs/PRODUCT_PLAN.html`, served locally (see below). | Current |
| D18 | **"Following" means people following you** (a follow system with followers), not a feed/tab. | Final (user, 2026-11-09) |
| D19 | **People you may know:** Facebook-style suggestions, contact import + invite, same-school/city/Rooms/mutual signals; staged ML. Real accounts only, anonymous identity never used. User said "good, build it" (phase 4). Details: plan section 7b. | Approved, phase 4 |
| D20 | Email + password sign-in stays (already built). | Final |
| D21 | "People who already have my number can find me" **starts ON**, clear notice at sign-up, one-tap switch-off in Settings (user said "do it the right way"; lawyer to confirm wording under Nigerian data protection law). Pop-up frequency still open. | Chosen 2026-11-09 |
| D22 | **Auto-assigned names** like quietfox4821 (word lists + digits, 3 to 20 chars), never derived from real details; block real people/brands, official-sounding names, offensive words, and digit runs 88/1488/69/420/666. User's examples (mrbeast7899, ghost88human3909) show the style; the generator must avoid the celebrity name and the "88" hate code. Re-roll at sign-up, change every 30 days. | Agreed (style), details planned |
| D23 | **Pay to climb:** a boost moves up ONE STEP, at most once per 24h (interpretation; one whole rank a day was the alternative and is not recommended). Price grows with rank, shown up front, no randomness. Hall of Fame counts earned points only (recommended). Store billing rules apply in a native app (verify). | Awaiting confirmation of "step vs rank" |
| D24 | **Ranks on anonymous posts:** yes on auto-name (pseudonym) posts and comments, no on no-name posts; two separate ladders (real and Ghost), never linked or shown together. Two ways to post anonymously (no name / auto name). | Awaiting user |
| D25 | Visitors land on the Anonymous feed (`/` redirects to `/anonymous`). Bottom nav: Anonymous, Room, Market, Me. Point of sale: say what you can't say anywhere else, to your own campus, with your name hidden. | Built |
| D26 | It is called an **Anonymous ID** (not "Ghost"). Auto-filled, editable, re-roll. Style: uncanny56, witty89, jin90, quietfox4821. | Built |
| D27 | **Video: 15 seconds, Room only** (real accounts). Anonymous = photos + text, text posts shown as gradient cards (4 themes). Video is technically on in the Room composer; keep it flagged off for the public until the scanner exists (phase 2/8). | Built, rollout gated |
| D28 | Drafts: text, options and card style are saved on the device while typing and restored; photos/video are not kept. | Built |
| D29 | Share cards carry a small link line (phase 1). | Decided |
| D30 | Launch focus: **AAUA** (Adekunle Ajasin University, Akungba) and **RUGIPO** (Rufus Giwa Polytechnic, Owo), both Ondo State and both in the school list; plus "OFG" (unknown, asked) and Nigerian Devs and topic Rooms. Rooms area shows a few cards with "See more". | Phase 4 |
| D31 | After a suspension ends we email "you're back". User wrote "after just 7 days for now": I read it as strikes expiring after 7 days for now. **Unconfirmed.** | Asked |
| D32 | Level names confirmed as proposed; "skip the Climb" for paying users is fine; no 2go names to add. | Final |
| D33 | Existing code is vetted, not trusted. Audit in `docs/BACKEND_AUDIT.md`: 7 fixes applied and tested; open items O1 to O8 remain. | Done |
| D34 | Photos are always re-encoded in the browser (removes GPS and camera data); an original file is never uploaded. Proven with a test; the old code leaked it. | Built, tested |
| D35 | Fonts self-hosted with next/font; old remote script fonts removed (they blocked first paint on slow networks). | Built |
| D36 | Sign-up checks username availability and shares one rule set with the server. | Built |

## 3. Open questions for the user
1. ~~Anonymous feed tabs~~ **Decided 2026-11-10:** Hot only, no tabs (the post you just published is pinned first). Bans and suspensions lift after 7 days with a "you're back" email (my reading of the user's note; confirm).
2. What is **"OFG"** (a launch school)?
3. What did "after just 7 days for now, then mail them they are in again" mean exactly (strike expiry, or suspension length)?
4. Pro price, and is ad-free part of Pro? One paid climb step per 24 hours (assumed) or one whole rank?
5. Third strike: reset rank, drop a phase, or just a ban?
6. Order of the top ranks (Great Sage at the very top?).
7. Email verification: still ask for the 6-digit code at sign-up (current), or let people in and ask only before posting in Room (needs a Supabase setting)?

## 4. Accounts and environment still needed
New Supabase project; Google Cloud OAuth web client (+ authorised origin); ZeptoMail account with a verified sending domain; TikTok developer app (Login Kit, https redirect); Apple Developer account (for Apple sign-in); payment provider (Paystack or Flutterwave); domain and `admin.` subdomain; support email.


## Update 2026-11-10 (Phase 1)
- Share cards (1080x1920, small link line) and Open Graph preview images are built. Test suites on the production build: auth 29, anonymous 51, main 26, all passing.
- Test harness now serves sample photos locally; earlier timeouts were the internet fetch, not the app.
- `metadataBase` reads NEXT_PUBLIC_SITE_URL (set it at deploy).
- BLOCKER: Supabase project eopnpyhpxgdopamahohh does not exist (DNS fails). Restore it or give a new project; then run migrations 0001-0017 and verify for real.

## Update 2026-11-10 (media storage moved to Cloudflare R2)
- Photos and videos now go to Cloudflare R2 (free egress, 10 GB free). The browser asks `POST /api/v1/media/upload-url` for a signed PUT URL (content type and size are part of the signature), uploads straight to R2, and cleanup uses `DELETE /api/v1/media`. Keys stay on the server (`src/lib/r2.ts`, aws4fetch).
- Env (placeholders are in `apps/web/.env.local`): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (custom domain on the bucket, not r2.dev). `next.config.ts` exposes R2_PUBLIC_URL to the browser as NEXT_PUBLIC_R2_PUBLIC_URL, so it is read at build time.
- Only URLs under R2_PUBLIC_URL are accepted on posts, listings and avatars (`src/lib/media-url.ts`).
- Migration `0018_media_in_r2.sql`: the anonymous post function no longer checks Supabase `storage.objects`; the API route HEADs each file in R2 first. Not run yet.
- R2 bucket needs a CORS rule: AllowedOrigins = site origins, AllowedMethods = PUT, AllowedHeaders = Content-Type, Content-Length.
- Old route `/api/v1/anonymous/media-path` is now unused (the new upload route registers the path itself). Left in place.
- Tests: unit 12, auth 29, anonymous 58 (new R2 upload steps), main 26. Real R2 not exercised: needs the keys.

## Update 2026-11-10 (real database)
- Supabase database reset at the owner's request: public schema rebuilt, all 2,002 old accounts deleted, migrations 0001-0019 applied cleanly and verified (all 35 public tables have row security).
- Fixed: 0002 never ran on a clean database (anonymous_post_likes primary key blocked making user_id nullable). Fixed in place.
- Fixed privacy hole: `anonymous_post_owners` (post -> real author) was readable with the public key. Migration 0019 locks it. Public key now gets 401 on it and on anonymous_posts.author_id.
- Real-database checks run: public feed RPC works (200). Guest sign-in returned `anonymous_provider_disabled`: **turn on "Allow anonymous sign-ins" in Supabase > Authentication > Sign In / Providers.**
- Feed video: `components/cr/FeedVideo.tsx` loads a video only near the screen, shows its first frame as the poster, pauses when scrolled away, one plays at a time. Used in the Anonymous feed (Room's legacy video not changed).
- Seed accounts: deleted. `apps/web/scripts/seed-users.cjs` can recreate them; decision on using them is the owner's (see the FTC / store-policy discussion; prefer clearly labelled staff accounts).
- R2 env names accepted: R2_BUCKET or R2_BUCKET_NAME, R2_PUBLIC_URL or R2_PUBLIC_BASE_URL (root .env is loaded by next.config.ts). Real-bucket test passed (signed PUT, type/size mismatch refused with 403, HEAD, public domain, DELETE). STILL NEEDED: CORS rule on the bucket (preflight currently 403, so browser uploads fail until it is added).
- 2026-11-10 real end-to-end test passed (real Supabase + real R2 + browser): sign-in, anonymous photo post, signed upload to R2 (CORS rule live), file served from the media domain, GPS/EXIF stripped. Test data removed afterwards.
- Bug found only by the real test: `next.config.ts` must load the root .env AND re-load apps/web (Next caches env; each forced load wipes the other). Fixed by snapshotting the root values. If R2 uploads say "storage not configured", check this first.

## Update 2026-11-10 (Phase 2 safety, first slice)
- Migration `0020_moderation_strikes.sql` (applied): `user_restrictions` table (server-only), `apply_strike()` (service role only), `get_my_restriction()`. Ladder: strike 1 = 3-day pause, strike 2 = 7-day pause, strike 3+ = ban; every restriction lifts on its own after at most 7 days. `ended_notified_at` is there for the "you're back" email (email sending is NOT built yet: needs ZeptoMail).
- Enforcement: `authenticateRequest` refuses POST/PUT/PATCH for a restricted user with 403 `account_restricted` and the reopen date. Reading and deleting own things still work. If the check itself fails it lets the request through (an outage must not lock everyone out).
- `POST /api/v1/admin/strike {userId, reason}` (admin only) applies the next strike. No admin screen for it yet.
- Anonymous text filter (`lib/text-filter.ts`): no phone numbers, emails or links in anonymous posts, comments and messages sent through a link. Private thread replies are not filtered.
- Tested against the real database and server: 11 checks (ladder, enforcement, self-reopen, users cannot read or call strike tools). Unit tests 14. Browser suites unchanged.
- Still to build in Phase 2: sensitive-content blur, per-action rate limits beyond anonymous, report queue screens + moderator actions UI, rules/legal pages, "you're back" email.

## Update 2026-11-10 (Sprint 1, see docs/SPRINTS.md)
- Migrations applied: 0021 (moderation queue + resolve_report), 0022 (rate-limit wrapper). Now 0001-0022.
- Self-serve account deletion: `DELETE /api/v1/account` + Settings sheet (type DELETE). Removes account, content (database cascade), and files in R2. Works while paused/banned. LIMITATION: Cloudflare's CDN caches files for up to 4 hours (`max-age=14400`), so a deleted file can still load from its link for up to 4 h. Fix = purge-on-delete, needs a Cloudflare API token + zone id (not set).
- Legal pages: /terms, /privacy, /guidelines (public, linked from sign-up and Settings). Draft text, needs lawyer review.
- Moderator queue: `GET/POST /api/v1/admin/moderation`, screen `/admin/moderation`, `POST /api/v1/admin/strike`. Admin = ADMIN_EMAIL env (falls back to the old hard-coded address).
- Rate limits via `consume_rate_limit` wrapper (fails open if the counter errors).
- Real-system test scripts live in the session scratchpad (db/real-*.cjs): moderation 11, queue 10, admin API 8, deletion 7 (the CDN-cache check is a known fail), rate limit 2.
- Not done in Sprint 1: sensitive-content blur.

## Update 2026-11-10 (notifications, sensitive media, limits)
- Migration 0023 (applied): `notifications` table + triggers for Room likes/comments/replies, follows, anonymous comments/replies, anonymous inbox messages. Anonymous kinds store no actor. Triggers swallow their own errors, so they can never block the action. RLS: read/mark-read/delete own only; nobody can insert from the API.
- `GET/POST /api/v1/notifications`, real screen at /notifications, unread dot on the Room bell.
- Sensitive media: author ticks "This photo is sensitive" in the Anonymous composer; the flag lives inside each media item (no schema change); the feed blurs it until tapped. Verified on the real database (stored and returned in the signed-out public feed).
- Rate limits: Room post/comment and listing caps REMOVED at the owner's request. Still in place: upload-link 120/h, Room report 30/h.
- Tests now: anonymous suite 71, auth 29, main 26. Real-system scripts: notifications triggers 12, notifications API 6.

## Update 2026-11-10 (dropdown, Paystack, media scanning; agents stopped)
- A first attempt to build ten features in parallel with agents hit the account usage limit and stopped before writing any code or migrations (nothing was left behind; verified: no stray tables/users/servers). Remaining features are being built one at a time by the main session. docs/AGENT_BRIEF.md and the db helper scripts remain usable.
- Notifications drop-down from the bell (Room): `NotificationsPanel`; "See all" opens /notifications. Suites: anon 75, auth 29, main 26.
- Migration 0024: notifications carry `title` + `link` and new kinds (market_message, room_join, room_post, rank_up, reveal_*, ad_status, restriction, system).
- Paystack foundation (migration 0025): `payments`, `user_entitlements`, `apply_payment_success`, `mark_payment_unsuccessful`; `POST /api/v1/payments/initialize`, `GET /api/v1/payments/verify`, `POST /api/paystack/webhook`, `/payments/return` page; server decides prices (`lib/payments/catalog.ts`: pro_month, ultimate_pass; env PRICE_*_NGN; Pro price still undecided by owner). Payment is always confirmed by asking Paystack, never trusted from the redirect/webhook body. NEEDS env: PAYSTACK_SECRET_KEY (server) and register webhook URL https://<domain>/api/paystack/webhook in Paystack. No buy button is exposed yet: each product's screen ships with its feature (ads, Pro, paid climb). Tests: 6 unit + 23 real.
- Media scanning (migration 0026): Google Cloud Vision SafeSearch (photos) + Video Intelligence (videos, 1000 free minutes/month). After a post/listing is published a background scan runs (`after()`); explicit => removed + owner notified + recorded for review; likely => blurred (anonymous). No automatic strike. Retry job `GET /api/cron/scan-media` (CRON_SECRET). Admin list `GET /api/v1/admin/media-flags`. NEEDS env GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON (service account with Vision API + Video Intelligence API enabled); without it scanning is off and files stay queued as pending. Tests: 12 unit (mocked Google) + 16 real DB/route. Sightengine was rejected: free plan has no video.
- Hot Anonymous feed (migration 0027): ONE feed built from nationwide posts + your own school's posts, ranked by `(likes + 2*comments + 1) / (hours old + 2)^1.6` over 30 days (not a tab). `get_hot_anonymous_posts_page` / `get_public_hot_anonymous_posts_page`; API `GET /api/v1/anonymous/posts?page=1&sort=hot` (cursor carries the ranking moment so scrolling never repeats or reshuffles; new posts appear on refresh). The old newest-first call is unchanged. Blocked authors hidden; signed-out visitors get the nationwide part. 21 real checks.
- Paystack webhook: the domain commonroom.feuxlabs.com.ng did not resolve in DNS on 2026-11-10 (so Paystack rejected the webhook URL). Set the webhook after the site is deployed and the domain points at it.
- Marketplace chat (migration 0028): `market_threads` + `market_messages`, functions `start_market_thread`, `send_market_message`, `mark_market_thread_read`, `list_my_market_threads`, `get_market_thread`; API `/api/v1/market/threads[...]`; screens `/marketplace/messages` and `/marketplace/messages/[id]`, "Message seller" in the listing's Contact sheet, Messages button in the Market header. One unread notification per thread; read-only once the item is sold/removed; messages cannot be edited or inserted around the functions; rate limits 30/min messages, 20/h new threads. Tests: 37 real + 23 browser. Not done: reporting a chat message, block-from-chat (blocks arrive with the block/mute feature).
- Media scanning now prefers the Gemini API (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, default gemini-3.5-flash-lite; free tier, no billing). Google Cloud Vision/Video Intelligence stays as a fallback when `GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON` is set. Gemini rates nudity/sex/suggestive/violence 0-1; we remove at sexual_activity>=0.8 or explicit_nudity>=0.85, blur at >=0.5 (explicit/sex) or >=0.85 (suggestive/violence); Gemini refusing = blur, PROHIBITED_CONTENT = remove; unreadable/failed answer = error, retried, never a pass. CAVEATS: free-tier content may be used by Google to improve products (disclosed in /privacy); free-tier rate limits are not published in the docs (see aistudio.google.com/rate-limit); never tested against the real Gemini yet (no key). 13 unit tests with mocked replies.
- Hydration fix: `lib/use-hydrated.ts` (pages that read the saved sign-in during first paint should use it).
- DECISION (owner, 2026-11-10): automatic checks (Gemini) NEVER delete or hide anything. Highest action = FLAG for a moderator + WARN the author (notification "Heads up..."), once per flagged item. Migration 0029 replaces the earlier blur/remove behaviour: table `auto_flags`, `flag_content()`, `apply_media_verdict()` now only flags, `moderation_queue()`/`resolve_report()` gain source 'auto' (a person chooses dismiss / remove / remove + strike). Text is checked too (`scanTextWithGemini`): Room post captions, anonymous post title+body, listing title+description; threshold 0.8 on any of harassment/threats, hate, sexual content, self-harm encouragement, scam; texts under 12 chars skipped. NOT yet checked: comments and chat messages. Photo/video flagging thresholds unchanged (verdict.ts) but 'blur' and 'remove' both just flag. Tests: 27 real (flag/queue/privacy), 8 text + 13 media unit (mocked Gemini), existing queue/admin/moderation checks still pass. Needs GEMINI_API_KEY to run; never run against the real Gemini yet.
- DECISION (owner, 2026-11-10): automatic checks may put a Twitter-style click-through blur (eye icon + "This may contain explicit content" + "I know, show it") in front of flagged media; still never delete. Migration 0030: `apply_media_verdict` marks the item `sensitive` (anonymous posts, Room post media) and sets `marketplace_listings.images_sensitive`; shared `components/cr/SensitiveGate.tsx` used in the Anonymous feed, Room card/reels/viewer, listing page; browse thumbnails are blurred. Tests: 8 browser (test-sensitive) + 27 real.
- Deploy readiness (2026-11-10): not-found/error/global-error pages, robots.txt, sitemap.xml, manifest + /pwa-icon/{192,512}, GET /api/health (database ping), security headers (CSP in report-only), `scripts/apple-client-secret.cjs`, `docs/DEPLOY.md` runbook. All suites pass: sensitive 8, anon 76, auth 29, main 26, chat 23.
- Block & mute (migration 0031): `user_blocks`/`user_mutes` (server-only), restrictive row-security policies hide blocked people both ways (posts, comments, listings, profiles) and muted people from the muter (posts, comments); triggers refuse follow/like/comment/chat between blocked people; blocking removes follows. API `/api/v1/safety/{blocks,mutes,relationship/<id>}`; UI: "more" menu on a person's profile, Settings > Safety > Blocked/Muted accounts. Blocked person cannot tell they were blocked. Tests: 49 real + 14 browser. NOT covered: reporting a chat message or a profile (no report source yet).
- "You're back" email (migration 0032): `lib/mailer.ts` (ZeptoMail REST; env ZEPTOMAIL_TOKEN, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, optional ZEPTOMAIL_API_URL for non-.com regions), `lib/emails/restriction-ended.ts`, `GET /api/cron/restrictions-ended` (CRON_SECRET; marks only after the email was accepted; skips people under a newer restriction; 5 attempts). `apps/web/vercel.json` runs it and the scan retry once a day (Hobby plan limit; run more often on Pro). The regional ZeptoMail endpoint could not be confirmed from their docs: if your account is not on .com set ZEPTOMAIL_API_URL. Tests: 7 unit + 16 real (fake ZeptoMail on localhost).
- Hydration: `/u/[id]` and `/marketplace/messages/[id]` fixed with `useHydrated`.
- Captcha for guest sign-ins (`lib/turnstile.ts`, Cloudflare Turnstile; off without NEXT_PUBLIC_TURNSTILE_SITE_KEY; CSP allows challenges.cloudflare.com) and CDN purge on delete (`lib/cdn.ts`; off without CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID; hooked into DELETE /api/v1/media and account deletion). 9 unit tests.
- Sign in with TikTok (migration 0033): `GET /api/auth/tiktok/start` + `/callback`, `tiktok_identities`, `tiktok_login()` (random one-time password per login, internal non-mail address), page `/auth/tiktok-complete`, button shown only with NEXT_PUBLIC_AUTH_TIKTOK_ENABLED=true. TikTok gives no email. Needs TIKTOK_CLIENT_KEY/SECRET and the app approved in TikTok's portal. 8 unit + 28 real (fake TikTok on localhost). The owner will finish the TikTok portal setup later.
- Latest full run (2026-11-10): browser safety 14, sensitive 8, anon 76, auth 29, main 26, chat 23; real: blocks 49, chat 37, notif-api 6, hot feed 21, admin 8, queue 10, moderation 11, payments 23, flags 27.
- STILL TO BUILD: communities, People You May Know, analytics + post insights, levels + Pro, sponsored ads, admin console on the new schema + feature flags, shorter onboarding, comment/chat scanning, report buttons for chat messages and profiles.
