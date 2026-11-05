# Common Room: replace the UI with the new design

The frontend already exists but uses the wrong design. `common-room-auth.html` (88 screens, numbered) is now the only design reference. The old UI is not.

**This overrides any older instruction to "preserve the existing UI".** Replace how things look. Keep what they do.

Scope: Anonymous, Room, Market, admin, profile and settings, file uploads. Not in scope: games, Meet, connect, dating, React Native.

## The golden rule
Change the presentation layer only: pages, layouts, components, styles. Do **not** rewrite working backend code, API routes, database schema, auth, or data hooks. If a screen in the mockup needs something that doesn't exist yet, build it in a gap sprint (Sprints 12 to 14), not by guessing.

## Paste this at the start of every sprint

> You are replacing the UI of the existing Common Room Next.js app with the design in `/design/common-room-auth.html`.
> 1. Read the listed mockup screens first. Then read the current page and components that do the same job.
> 2. Keep the current data fetching, API calls, validation, auth and state logic. Move it into the new components. Do not rewrite it.
> 3. Rebuild the markup and styles to match the mockup exactly: small fonts, regular or medium weight, compact buttons (never wider than their text unless the mockup shows full width), same colours, spacing, icons, loading, empty and error states.
> 4. Use only the shared components from Sprint 1. Do not make one-off styles. Delete old components and CSS once nothing uses them.
> 5. Do not change behaviour. If something looked broken before, note it in the report and fix it only if it is small.
> 6. The server stays the authority for permissions, counts and eligibility. Anonymous sender identity is never exposed.
> 7. Finish with: screens done, old files deleted, tests run, anything that didn't match, anything missing.

A sprint is done only when its "Done when" check passes. Do not start the next one before that.

---

## Sprint 0: Audit and map
**Screens:** all
- Inspect the repo, `plan.md`, routes, components, styles and migrations. Confirm the build and typecheck pass; fix blockers first.
- Copy the mockup into `/design`.
- Produce `docs/ui-map.md`: a table with every mockup screen number, the current route or component that covers it, and a status of **restyle**, **rewrite**, **missing**, or **remove**.
- List old screens that have no mockup (games, Meet and similar) under **remove**.
- Replace `plan.md` with this sprint list.

**Done when:** every one of the 88 screens has a row in `ui-map.md` and nothing is guessed.

## Sprint 1: Design system
**Screens:** all (shared)
- Tokens from the mockup (colours, type scale, radii, spacing) in one place.
- Components: Button, Chip, Toggle, Tabs, Header, ListRow, Avatar, Sheet, Toast, Banner, Input, Skeleton, EmptyState, ErrorState, ProgressBar.
- New bottom nav: Home, Room, Anonymous, Market, Me.
- A `/dev/components` page to compare against the mockup.

**Done when:** each component matches the mockup on phone and desktop widths.

## Sprint 2: App shell and navigation
**Screens:** Home, bottom nav
- Replace the layout, header and bottom nav with the new ones across the app.
- Remove nav entries for games, Meet and anything out of scope. Redirect their routes to Home.

**Done when:** every route renders inside the new shell and no old nav remains.

## Sprint 3: Accounts and onboarding
**Screens:** Welcome, Sign-in, 1 to 11
- Restyle sign up, password, username, verify email, onboarding (interests, school, photo), sign in, forgot and reset password, error states, session expired.
- Keep the existing auth logic exactly as it is.

**Done when:** sign up, verify, sign in, reset and logout all still work in the new UI.

## Sprint 4: Anonymous feed
**Screens:** Anonymous feed, 13, 15, 18, 19, 71, 72, 73
- Restyle the feed (Hot, Trending, Fresh), post card, create post, comments, report and share sheets.
- Keep the existing cursor loading. Show the end state only when the server says there is no more.
- Add the load-more-failed retry and empty and loading states from the mockup.

**Done when:** scrolling through a long feed still loads every batch with no repeats, likes and comments still work.

## Sprint 5: Inbox and message link
**Screens:** Inbox and link, 16, 17, 53, 74
- Restyle the inbox, conversation, share-publicly sheet, link settings and empty state.
- Keep the existing link and reply logic.

**Done when:** the link card, copy, share, pause and regenerate all still work.

## Sprint 6: Public message page (web)
**Screens:** Public message page, 20 to 25
- Rebuild the visitor page and all its states: typing, sending, sent, couldn't send, rate limit, link off, link not valid.
- Must work logged out and on phone browsers.

**Done when:** a logged-out visitor can send, and each bad-link state shows the right screen.

## Sprint 7: Room
**Screens:** Home, Room feed, 12, 14, 68, 69, 70, 76
- Restyle the Home feed, the vertical Room feed, create post, comments, and the loading, empty, error and offline states.
- Keep the existing feed queries, video handling and interactions.

**Done when:** both feeds, likes, comments and posting still work and match the mockup.

## Sprint 8: File uploads
**Screens:** 77, 78, 79
- Replace the upload UI with the new uploader: preview, progress, cancel, retry, remove, and the error states.
- Keep the existing upload endpoint. If it lacks server-side type and size checks, add them.
- Use the new uploader in posts, listings, profile photo and onboarding.

**Done when:** an upload shows progress, a bad file is refused with the right message, a failed one can be retried.

## Sprint 9: Market browse
**Screens:** Marketplace, 26, 29 to 34, 56, 75
- Restyle the market home, listing detail, filters and sort, location picker, seller profile, saved listings, no results, sold, and the loading skeleton.

**Done when:** search, filters and results still work and continue past the first batch.

## Sprint 10: Market selling
**Screens:** 27, 28
- Restyle create, edit and the owner view, with the new uploader.

**Done when:** create, edit, mark sold and delete all still work, and only the owner can do them.

## Sprint 11: Profile and settings
**Screens:** Profile and status, 38 to 41, 45 to 52
- Restyle own profile, edit profile, other users' profiles, block sheet, and every settings page including blocked users and delete account.
- Check each toggle really saves and takes effect. Remove any switch that does nothing.

**Done when:** all settings persist after logout and login.

## Sprint 12: Gap, Market chat
**Screens:** 35, 36, 37
- Build only if `ui-map.md` marks these missing. Chat per buyer, seller and listing, conversation list, sold listing makes it read-only, report and block inside.
- Keep it separate from the Anonymous Inbox.

**Done when:** one thread per buyer, seller and listing, and strangers cannot read it.

## Sprint 13: Gap, search and notifications
**Screens:** 54 to 61
- Build or restyle search (Room and Market, recent searches) and notifications, including the allow-notifications prompt.
- Anonymous notifications must show no sender and no message text.

**Done when:** notification types follow the user's settings.

## Sprint 14: Admin
**Screens:** 62 to 67
- Restyle the web admin: analytics, users, user detail, reports, complaints, announcements.
- Build any missing actions. Server-side role checks, audit log for every action, sender metadata only for the safety role with a logged reason.

**Done when:** a normal user gets 403 on every admin route and all actions are in the audit log.

## Sprint 15: Optional, status and leaderboard
**Screens:** 42, 43, 44
- Skip if you want this out. If kept, restyle only; titles and badges stay calculated by the server.

## Sprint 16: Cleanup and regression
- Delete every unused old component, style and route. Search the code for the old design's class names to be sure.
- Walk all 88 screens against the mockup at phone and desktop widths.
- Check fonts, weights and button widths. Check every feed has loading, empty, error and retry.
- Run the full flow: sign up, post, anonymous message, listing, chat, settings, admin.
- Try to read another user's messages and admin pages. All must fail.
- Production build passes.

**Done when:** no old UI remains, `ui-map.md` shows every row done, and tests pass.
