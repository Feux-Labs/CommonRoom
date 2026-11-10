# Common Room: sprint plan (2026-11-10)

Order = what blocks a real launch first. "Today" = the launch-ready core (Sprints 1-3). Everything after is post-launch.

## Done already (Sprint 0)
Auth screens, Anonymous feed/composer/share cards, Room, Marketplace, Profiles, R2 uploads, real Supabase (migrations 0001-0020, row security everywhere), strikes + enforcement + contact-detail filter.

## Sprint 1: Store-ready safety and legal  (TODAY) - 4 of 5 DONE, tested for real
1. DONE. Account deletion (API + button in Settings). Required by Google Play and Apple.
2. DONE (draft text: have a Nigerian lawyer review before launch). Terms, Privacy, Community Guidelines pages, linked from sign-up and Settings.
3. DONE. Report handling: one queue of every report (anonymous, Room, Marketplace) + dismiss / remove / remove + strike. Screen at /admin/moderation.
4. NOT DONE. Sensitive-content blur (author flag + viewer tap to reveal).
5. DONE. Rate limits: Room post 20/h, comment 60/h, report 30/h, upload link 120/h, listing 10/day.

## Sprint 2: Real sign-in and email  (TODAY, needs your keys)
1. Email codes through ZeptoMail (Supabase SMTP).  Needs: SMTP user/password, from-address.
2. Google sign-in.  Needs: Google client ID.
3. 30-second onboarding (delay email code, optional interests/photo).
4. "You're back" email when a restriction ends.

## Sprint 3: Ship  (TODAY)
1. Host on Vercel (or your choice), domain, env vars, NEXT_PUBLIC_SITE_URL, R2 CORS for the real domain.
2. Full browser regression + real-database smoke on the deployed URL.
3. Fix list from that run.

## Post-launch sprints
4. Notifications + Marketplace chat.
5. Rooms (communities: AAUA, RUGIPO, Nigerian Devs) + People You May Know.
6. Analytics + post insights.
7. Separate admin app (admin. subdomain) with feature flags.
8. Pro, levels and the paid climb.
9. Sponsored ads.
10. Video scanning, TikTok and Apple sign-in, performance pass.
