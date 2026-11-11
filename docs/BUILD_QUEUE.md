# Build queue (owner's list, 2026-11-10). One at a time, each ticked only after it passes tests on the real system.

- [x] 1. Report buttons for chat messages and profiles
- [x] 2. Scanning of comments and chat messages
- [x] 3. Shorter onboarding ("Are you a student?" Yes/No/Skip, interests removed, school optional, photo optional; 13 browser tests)
- [x] 3b. Guest-first Anonymous + one-time 18+/Terms popup saved server-side (25 real checks, browser suites anon 78/auth 30/main 26/chat 27/safety 16/sensitive 8/onboarding 13). Room stays visible to everyone; `NEXT_PUBLIC_ROOM_ENABLED=false` is only an emergency off switch. Dismissible sign-in nudge for guests (3/7/14 day cooldown).
- [x] 4. Admin console + feature flags (admin Feature flags tab; migration 0037; server kill switches anonymous_posting + anonymous_inbox, tab switches room_tab/market_tab/signin_nudge; real 14 checks + browser 4)
- [x] 5. Analytics and post insights (migration 0038: app_events keyed by user id incl. guests + is_anonymous + first-touch ?s= source; author-only post insights for Anonymous and Room posts, UI on Anonymous; admin Growth tab; real 20 + admin 2 + browser 5 checks)
- [x] 6. People You May Know (migration 0039 suggest_people: mutual follows + same public school, excludes blocked/muted/followed, hidden schools never used or shown; shown on Search when the box is empty; real 19 + browser 4 checks)
- [x] 6b. Inbox prompt templates + AI generate (optional) + public reply cards + Messages you sent + edit own Anonymous posts + centred text (migrations 0040-0043; fixed a real bug: inbox links could not be created on Supabase; real 22 + 11 + 21 checks, AI unit 8, browser templates 13 + edit 5)
- [ ] 7. Communities
- [ ] 8. Levels and Pro
- [ ] 9. Sponsored ads
