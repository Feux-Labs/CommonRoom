# TECH NATION GLOBAL TALENT — ARCHITECTURAL BLUEPRINT & ROADMAP
**Schoomateapp / Common Room Web Platform (`apps/web`)**

This document serves as the master engineering specification, architecture guide, and execution roadmap for Schoomateapp. Any AI agent or developer continuing this project must follow the patterns and standards documented here.

---

## 1. Vision & Engineering Caliber

Common Room is designed to be the definitive campus social network, combining the best engagement mechanics of global platforms tailored for university students:
- **TikTok**: High-retention vertical media spotlights, sound tagging, double-tap micro-interactions, low-latency client-side media compression.
- **Instagram**: Rich multi-image carousels, unseen story rings, interactive profile inspection sheets, bookmarking/saves.
- **Facebook**: University community boundaries, verified school badges, campus-scoped vs cross-campus social graphs.
- **NGL**: Card theme customizer, viral story prompt links, cryptographically isolated anonymous inboxes, dice-roll prompt generator.
- **Reddit**: Deep hierarchical comment threads with guide lines, logarithmic score decay ranking.
- **Blind**: Verified university affiliation without deanonymizing the student, privacy-preserving confession boards.
- **Yik Yak / Sidechat**: Hyperlocal geofenced campus feeds, instant meme and exam reaction cards.
- **X / Twitter**: Inline `@username` mention parsing, live autocomplete popups, interactive mention chips, instant notification triggers.
- **Discord**: Interactive poll voting with live percentage animations, student presence badges.
- **BeReal & LinkedIn**: Genuine student academic profiles (course/major, year of study, verified student badges) suitable for Tech Nation Global Talent review.

---

## 2. Core Modules & Architecture

### A. Room Experience (`apps/web/src/components/RoomExperience.tsx`)
- **Feed Scopes**:
  - `For You`: Personalized feed weighted by the student's university, followed creators, engagement velocity, and recency decay.
  - `General`: Cross-university discovery displaying top-trending discussions across all Nigerian universities.
  - `Following`: Reverse chronological feed strictly from followed students.
- **Media Types**: Photo carousels (1-10 photos), single high-res video with sound tag, text cards, and interactive polls.
- **Interactive Polls**:
  - Endpoint: `POST /api/v1/posts/[id]/poll-vote`
  - Atomic vote tallying with 1-vote-per-user constraint.
  - Real-time percentage bars with smooth CSS transitions and voter choice indicator.
- **Stories**:
  - Top story bar with gradient active rings (unseen vs seen).
  - Full-screen story viewer with touch/swipe, auto-advance, sound toggling, and keyboard navigation.

### B. Anonymous Experience (`apps/web/src/components/AnonymousExperience.tsx`)
- **Dual Mode**:
  - **Campus Anonymous Feed**: Filterable by `for_you`, `general`, `hot`, `trending`.
  - **Me / NGL Inbox**: Shareable prompt cards (`/anonymous/inbox/[token]`) with 6 punchy gradient themes, dice-roll prompt generator, and private threaded replies.
- **Self-Contained End-to-End Create Flow**:
  - Inline modal studio within the Anonymous experience (no disruptive route switching).
  - Live card preview updating dynamically as the user types.
  - Direct photo/video attachment with client-side WebP/MP4 compression and real-time upload progress.
  - Instant redirect to the newly published card in the feed.

### C. Mentions & Comment System
- **Tokenizer**: Parses `@username` and `#hashtag` inside captions, comments, and replies into interactive links.
- **Autocomplete**: Typing `@` triggers a floating user-suggestion dropdown.
- **Notifications**: Mentioning a user records a notification in `room_events` and populates the notification drawer.
- **Threaded Hierarchy**: One-level nested replies with parent author badge and clear visual nesting.

### D. Algorithmic Personalization Formula
The campus feed velocity score uses a half-life recency decay formula:
$$\text{Score} = \frac{(\text{Likes} \times 2) + (\text{Comments} \times 3.5) + (\text{Saves} \times 3) + (\text{Shares} \times 4) + \text{AffinityBonus}}{(\text{AgeInHours} + 2)^{1.25}}$$
- **Affinity Bonus**:
  - Author is from the same university: `+15.0`
  - Current user follows the author: `+12.0`
  - High engagement ratio in first 6 hours: `+8.0`

### E. User Profile System
- **Profile Modal Sheet**: Display name, `@username`, university, academic course, year of study, follower/following counts, bio, and post history.
- **Follow Graph**: Instant optimistic follow/unfollow toggle with rollback on network error.
- **Universal Links**: Clicking any avatar or username anywhere opens the profile sheet seamlessly.

### F. Connect / Meet Hub (`apps/web/src/components/MeetExperience.tsx`)
- Match / discovery cards filtered by school, course, and interests.
- Direct transition into real-time campus conversations.

### G. Real-World Nigerian Campus Verification (Universal Email + Zero-Knowledge Affiliation)
- **Universal Email Support**: Any email provider is supported (Gmail, Yahoo, iCloud, Outlook, etc.) recognizing that tertiary institutions across Nigeria do not provide operational student `.edu.ng` email addresses.
- **Campus Affiliation Model**:
  - Verification is anchored to the selected Nigerian institution (`institutions.ts`), course/department, and matriculation ID pattern.
- **Zero-Knowledge Anonymous Badge**:
  - Allows verified students to post with a "Verified Student • [Campus Name]" tag (e.g. `Verified • UNILAG`).
  - Cryptographically isolated: the anonymous post stores only the verified school label with an opaque token, ensuring zero deanonymization or linkage back to the student's personal email or profile.

---

## 3. Deployment & Production Standards

1. **Zero TypeScript Errors**: Every file must pass `npx tsc --noEmit`.
2. **Zero Next.js Build Warnings**: `npm run build` must succeed with static and dynamic routes correctly configured.
3. **Graceful Demo Fallback**: When deployed to Vercel without Supabase environment variables, all interfaces must fall back gracefully to rich mock data from `demo-content.ts` instead of failing or displaying blank screens.
4. **Performance & Accessibility**: WCAG 2.1 AA compliant contrast, aria attributes on interactive modals, responsive touch targets (minimum 44x44px).
