# Room handoff — 2026-10-15 ~10:20 UTC+1

Do **not** re-analyze Anonymous, Marketplace, or the whole app. Continue Phase 2 Room only.

## Where the previous session stopped
Chat [Room feature completion](cfe445f4-3d74-4601-926f-80c87bf78efb) hit a usage limit while finishing Room.

## Already done (do not redo)
- `apps/web/src/components/RoomExperience.tsx` is the Home/Room UI (stories, For You/Following/General, infinite scroll, likes/saves/share/report/hide/delete, threaded comments, media carousel, spotlight viewer, profile overlay, people rail, invite).
- Home is `apps/web/src/app/page.tsx` and renders `RoomExperience`. Shared links: `apps/web/src/app/posts/[id]/page.tsx` reuses Home; `focusPostId` comes from `usePathname()`.
- Feed: `GET /api/v1/posts` uses `get_room_feed_page` RPC, fallback query + `attachRoomViewerFields`.
- Single post GET/DELETE, comments GET/POST (one-level replies), like/save/share/report, people list + profile, stories, room events, invites.
- CSS extras at end of `apps/web/src/app/globals.css` (carousel, comment replies, profile frame, spotlight).
- Migration: `supabase/migrations/0008_room.sql` (RPC already returns liked/saved/counts/avatar).

## This continuation (2026-10-15) closed
- Comment POST rejects closed comments (`allow_comments`).
- Stories attach viewer like/save/share/avatar fields.
- Profile posts select includes `post_saves(count)`.
- Follow/Unfollow on the post menu uses `followingById`.
- Comment form hidden when `allowComments === false`.
- Spotlight viewer: keyboard + vertical/horizontal swipe.
- `advanceStory` / `advancePost` are `useCallback` + functional `setViewer`.

## Verification (this session)
- `npx tsc --noEmit` in `apps/web` passed.
- App boots at **http://localhost:3001** (port 3000 is a different project).
- Browser stopped at the Common Room **sign-in** screen: Sign in / Google are disabled with “Connect Supabase…”. No `apps/web/.env*` is present, so the logged-in feed could not be clicked through.
- Next agent: add local Supabase env, sign in, then click through feed/stories/comments/share/`/posts/{id}`. Do not re-read the whole codebase.

## Still remaining Room gaps
1. Logged-in browser pass (blocked on missing Supabase env).
2. RPC `get_room_feed_page` must be applied in the live Supabase project (`0008_room.sql`); without it, fallback query still works but ranking is weaker.
3. Polls are preview-only (no vote API).
4. Mobile Room is Phase 12 — do not port now.
5. Recommendation ML is Phase 3 — skip.

## Key files
- `apps/web/src/components/RoomExperience.tsx`
- `apps/web/src/lib/room-map.ts`
- `apps/web/src/lib/room-contracts.ts`
- `apps/web/src/app/api/v1/posts/route.ts`
- `apps/web/src/app/api/v1/posts/[id]/**`
- `apps/web/src/app/api/v1/room/stories/route.ts`
- `apps/web/src/app/api/v1/room/events/route.ts`
- `apps/web/src/app/api/v1/people/route.ts`
- `apps/web/src/app/api/v1/people/[id]/route.ts`
- `supabase/migrations/0008_room.sql`
