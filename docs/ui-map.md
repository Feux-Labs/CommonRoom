# Common Room UI map

Source of truth: [`../design/common-room-auth.html`](../design/common-room-auth.html) (88 captions).

Status definitions:

- **restyle** — a current web route or reachable screen already covers this job.
- **rewrite** — related functionality exists, but this screen/state is not a complete, reachable screen yet.
- **missing** — no current web screen or implementation was found.
- **remove** — outside the requested scope and not represented by the mockup.

The `apps/web/src/components/cr/screens/` files contain screen-shaped presentation components, but they are not imported by the app routes. They are noted as prototypes, not counted as working screens. Route and component references below are candidates for the UI work, not claims that each individual mockup state is already implemented.

| # | Mockup screen | Current route or component | Status |
|---:|---|---|---|
| 1 | Welcome | `apps/web/src/app/page.tsx` (auth entry) | **restyle** |
| 2 | Sign-in | `apps/web/src/app/page.tsx` (auth entry) | **restyle** |
| 3 | Home | `apps/web/src/app/page.tsx` | **restyle** |
| 4 | Room feed | `apps/web/src/app/page.tsx`; `apps/web/src/components/RoomExperience.tsx` | **restyle** |
| 5 | Anonymous feed | `apps/web/src/app/anonymous/page.tsx`; `apps/web/src/components/AnonymousExperience.tsx` | **restyle** |
| 6 | Inbox and link | `apps/web/src/app/anonymous/page.tsx`; `AnonymousExperience.tsx`; `/api/v1/anonymous/inbox/*` | **restyle** |
| 7 | Public message page (web) | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **restyle** |
| 8 | Marketplace | `apps/web/src/app/marketplace/page.tsx`; `MarketplaceExperience.tsx` | **restyle** |
| 9 | Profile and status | Profile tab in `apps/web/src/app/page.tsx` | **rewrite** |
| 10 | 1. Create account, email | Signup modal in `apps/web/src/app/page.tsx` | **restyle** |
| 11 | 2. Create account, password | Signup modal in `apps/web/src/app/page.tsx` | **restyle** |
| 12 | 3. Create account, username | No username creation or availability UI found | **missing** |
| 13 | 4. Verify email | Signup confirmation screen in `apps/web/src/app/page.tsx`; Supabase email link and resend | **restyle** |
| 14 | 5. Onboarding, interests | `OnboardingWizard.tsx`; onboarding state in `apps/web/src/app/page.tsx` | **restyle** |
| 15 | 6. Onboarding, school | `OnboardingWizard.tsx`; onboarding state in `apps/web/src/app/page.tsx` | **restyle** |
| 16 | 7. Onboarding, photo | `OnboardingWizard.tsx` optional JPG/PNG/WebP photo step; uploads to `post-media` and persists the existing `avatar_url` profile field | **restyle** |
| 17 | 8. Forgot password | Forgot-password modal in `apps/web/src/app/page.tsx` sends reset email | **restyle** |
| 18 | 9. Reset password | Password-update screen in `apps/web/src/app/page.tsx`, shown on Supabase `PASSWORD_RECOVERY` | **restyle** |
| 19 | 10. Sign-in error states | Auth entry in `apps/web/src/app/page.tsx`; auth presentation prototype is unwired | **rewrite** |
| 20 | 11. Session expired | No current session-expired screen or route found; prototype is unwired | **missing** |
| 21 | 12. Create post (Home and Room) | Create flow in `apps/web/src/app/page.tsx`; `RoomExperience.tsx` | **restyle** |
| 22 | 13. Create anonymous post | `AnonymousExperience.tsx`; anonymous post APIs | **restyle** |
| 23 | 14. Comments, Room | Room post flow in `apps/web/src/app/page.tsx`; `RoomExperience.tsx` | **restyle** |
| 24 | 15. Comments, Anonymous | `AnonymousExperience.tsx`; anonymous comments API | **restyle** |
| 25 | 16. Inbox conversation | `AnonymousExperience.tsx`; `/api/v1/anonymous/inbox/*` | **restyle** |
| 26 | 17. Share message publicly | `AnonymousExperience.tsx`; anonymous thread share API | **restyle** |
| 27 | 18. Report sheet | Post/report flows in `AnonymousExperience.tsx` and `apps/web/src/app/page.tsx` | **restyle** |
| 28 | 19. Share sheet | Share flows in `AnonymousExperience.tsx` and `apps/web/src/app/page.tsx` | **restyle** |
| 29 | 20. Message typed, sending | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **restyle** |
| 30 | 21. Message sent | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **restyle** |
| 31 | 22. Couldn’t send (message kept) | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **rewrite** |
| 32 | 23. Too many messages (rate limit) | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **rewrite** |
| 33 | 24. Link turned off | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **rewrite** |
| 34 | 25. Link not valid (invalid, expired or replaced) | `apps/web/src/app/anonymous/inbox/[token]/page.tsx` | **rewrite** |
| 35 | 26. Listing detail | `apps/web/src/app/marketplace/[id]/page.tsx` | **restyle** |
| 36 | 27. Sell an item | Marketplace UI in `MarketplaceExperience.tsx`; no dedicated create route found | **rewrite** |
| 37 | 28. Your listing (owner) | `apps/web/src/app/marketplace/[id]/page.tsx`; marketplace listing APIs | **rewrite** |
| 38 | 29. Filters and sort | `apps/web/src/app/marketplace/page.tsx`; `MarketplaceExperience.tsx` | **restyle** |
| 39 | 30. Location picker | Marketplace UI; `/api/v1/locations/search` | **rewrite** |
| 40 | 31. Seller profile | Marketplace listing detail; `/api/v1/people/[id]` | **rewrite** |
| 41 | 32. Saved listings | Marketplace UI; marketplace saved-listing APIs | **rewrite** |
| 42 | 33. No results | `apps/web/src/app/marketplace/page.tsx` | **rewrite** |
| 43 | 34. Listing sold | `apps/web/src/app/marketplace/[id]/page.tsx`; listing API | **rewrite** |
| 44 | 35. Market conversations | No Market chat route or Market chat API found; `dating/chat` is out of scope | **missing** |
| 45 | 36. Chat with seller | No Market chat route or Market chat API found; `dating/chat` is out of scope | **missing** |
| 46 | 37. Chat, listing sold | No Market chat route or Market chat API found; `dating/chat` is out of scope | **missing** |
| 47 | 38. Edit profile | Profile tab in `apps/web/src/app/page.tsx`; `/api/v1/profile` | **rewrite** |
| 48 | 39. Other user’s profile | Search results open a profile sheet in `apps/web/src/app/page.tsx` using `/api/v1/people/[id]` | **restyle** |
| 49 | 40. Block user | Anonymous thread block API exists; no general profile block screen found | **rewrite** |
| 50 | 41. Your profile, Listings tab | Profile tab in `apps/web/src/app/page.tsx`; marketplace listing data | **rewrite** |
| 51 | 42. Your profile, Badges tab | No dedicated badges screen found; status prototype is unwired | **missing** |
| 52 | 43. How Common status works | No dedicated status explanation screen found; prototype is unwired | **missing** |
| 53 | 44. Leaderboard | No leaderboard route or screen found; prototype is unwired | **missing** |
| 54 | 45. Settings | Profile/settings presentation prototype in `cr/screens/ProfileSettingsScreens.tsx` is unwired | **rewrite** |
| 55 | 46. Settings, Account | No dedicated settings route found; profile/settings prototype is unwired | **rewrite** |
| 56 | 47. Settings, Privacy | No dedicated settings route found; profile/settings prototype is unwired | **rewrite** |
| 57 | 48. Settings, Notifications | No dedicated settings route or notification API found; prototype is unwired | **missing** |
| 58 | 49. Settings, Feed preferences | No dedicated settings route found; profile/settings prototype is unwired | **rewrite** |
| 59 | 50. Settings, App preferences | No dedicated settings route found; profile/settings prototype is unwired | **rewrite** |
| 60 | 51. Settings, Blocked users | No blocked-users route or screen found; profile/settings prototype is unwired | **missing** |
| 61 | 52. Delete account | No delete-account route or screen found; profile/settings prototype is unwired | **missing** |
| 62 | 53. Anonymous link settings | `AnonymousExperience.tsx`; pause API exists, but current create RPC preserves the existing token and cannot regenerate it | **rewrite** |
| 63 | 54. Search, start | Search modal in `apps/web/src/app/page.tsx`; recent searches persist locally and student search uses `/api/v1/people` | **rewrite** |
| 64 | 55. Search results, Room | Search modal finds students via `/api/v1/people` and schools locally; student rows open the existing profile API | **rewrite** |
| 65 | 56. Search results, Market | Marketplace search in `apps/web/src/app/marketplace/page.tsx` | **restyle** |
| 66 | 57. Search, no results (Room) | Search modal in `apps/web/src/app/page.tsx`; student no-results state is implemented; school no-results copy is still incomplete | **rewrite** |
| 67 | 58. Notifications | `apps/web/src/app/page.tsx` shows a truthful unavailable state; no notification API found | **rewrite** |
| 68 | 59. Notifications, empty | No notification feed/API found; an empty-state view cannot represent real notification history yet | **missing** |
| 69 | 60. Allow notifications | No notification permission flow or API found; discovery prototype is unwired | **missing** |
| 70 | 61. Search or notifications failed | Search/notification UI state in `apps/web/src/app/page.tsx`; no notification API found | **rewrite** |
| 71 | 62. Analytics | `apps/web/src/app/admin/page.tsx`; `/api/v1/admin/analytics` | **restyle** |
| 72 | 63. Users | `apps/web/src/app/admin/page.tsx`; `/api/v1/admin/users` | **restyle** |
| 73 | 64. User detail and actions | `apps/web/src/app/admin/page.tsx`; admin APIs | **restyle** |
| 74 | 65. Reports | `apps/web/src/app/admin/page.tsx`; `/api/v1/admin/reports` | **restyle** |
| 75 | 66. Complaints and feedback | `apps/web/src/app/admin/page.tsx`; admin data/API usage requires confirmation | **rewrite** |
| 76 | 67. Announcements | `apps/web/src/app/admin/page.tsx`; `/api/v1/admin/broadcast` | **restyle** |
| 77 | 68. Room feed, loading | Room feed in `apps/web/src/app/page.tsx`; `RoomExperience.tsx` | **rewrite** |
| 78 | 69. Room feed, empty | Room feed in `apps/web/src/app/page.tsx`; `RoomExperience.tsx` | **rewrite** |
| 79 | 70. Feed, couldn’t load | Room feed in `apps/web/src/app/page.tsx`; `RoomExperience.tsx` | **rewrite** |
| 80 | 71. Anonymous feed, load more failed | `AnonymousExperience.tsx`; anonymous posts API | **rewrite** |
| 81 | 72. Anonymous feed, end of feed | `AnonymousExperience.tsx`; anonymous posts API | **rewrite** |
| 82 | 73. Anonymous feed, empty | `AnonymousExperience.tsx`; anonymous posts API | **rewrite** |
| 83 | 74. Inbox, empty | `AnonymousExperience.tsx`; anonymous inbox API | **rewrite** |
| 84 | 75. Market, loading | `apps/web/src/app/marketplace/page.tsx` | **rewrite** |
| 85 | 76. Offline | Room/feed UI in `apps/web/src/app/page.tsx`; backend-connection state is incomplete | **rewrite** |
| 86 | 77. Uploading media | Shared `MediaUploadQueue` with live percentage and progress bar is used in Room, Anonymous, Market, profile editing, and onboarding | **restyle** |
| 87 | 78. Upload problems | Shared queue provides validation, removal, retry hooks, and errors; storage failure/retry behavior varies by flow | **restyle** |
| 88 | 79. Photo access off | No dedicated photo-permission screen found; uploader presentation prototype is unwired | **rewrite** |

## Existing screens with no mockup — remove from the new navigation

| Existing route or feature | Action |
|---|---|
| `/games-preview` and `GamesExperience` | **remove** from navigation; redirect the route to Home |
| Meet and `MeetExperience` | **remove** from navigation; redirect the route to Home |
| Dating/connect experience and `/api/v1/dating/*` | **remove** from navigation/UI scope; do not remove backend as part of a presentation-only sprint |
| React Native app | **remove** from this web redesign scope; do not modify it |

## Sprint 0 verification notes

- The supplied mockup was copied without transformation. It contains 88 labeled screen captions; the first nine are marked “Existing screens” in the HTML, and the remaining 79 are numbered 1–79.
- No migration directory exists under `apps/web/prisma`; the database schema is `apps/web/prisma/schema.prisma`. Sprint 0 makes no schema or migration changes.
- The initial build and typecheck exposed missing `isBackendDisconnected` and `setBackendDisconnected` exports used by `apps/web/src/app/nav/page.tsx`. Session-scoped browser storage helpers were added; `npx tsc --noEmit` now passes.
- The initial Next.js 16.4.0 build was stopped by its security-version gate. Next.js was upgraded to 16.4.3 and `experimental.agentUpgrade: "security"` was set in `apps/web/next.config.ts`; the production build now passes.
- Sprint 1's targeted ESLint check passes. The full-app lint command still reports pre-existing `require()` lint errors in `apps/web/scripts/check-anon-procs.cjs`, `apps/web/scripts/check-schema.cjs`, and `apps/web/scripts/seed-users.cjs`.
- The `/dev/components` preview was checked at 390px and 1280px widths. Both layouts have no horizontal overflow; shared component interactions and tab keyboard navigation were exercised.
- Some missing-route/API conclusions above are direct inventory findings, not implementation proposals. Reconfirm them against existing behavior before any gap sprint.
