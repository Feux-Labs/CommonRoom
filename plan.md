# COMMON ROOM — COMPLETE DEVELOPMENT ROADMAP

## CRITICAL INSTRUCTION: REPLACE THE EXISTING PLAN
This document replaces the entire existing `plan.md`.

1. Inspect the current repository, existing `plan.md`, codebase, completed features, and project structure.
2. Replace the existing `plan.md` with this roadmap. Do not append it to the old plan.
3. Remove outdated, conflicting, duplicated, or superseded tasks.
4. Preserve useful implementation knowledge only when it does not conflict with this roadmap.
5. Treat this document as the authoritative development plan.
6. Inspect existing code before making changes and reuse working functionality.
7. Do not rebuild completed features unnecessarily, replace existing UI without reason, or break working functionality.
8. Track completed, partially completed, and outstanding work accurately.
9. Work through the roadmap in order and test each phase.
10. Do not introduce Spring Boot or Spring Boot migration tasks. Use the existing Next.js architecture for the backend.

## IMPLEMENTATION STATUS — 2026-10-14

- **Phase 1 — In progress.** The Next.js Anonymous feature has feed posts, likes, comments, reporting, sharing, personal links, Inbox conversations, and private replies. Cursor-based feed loading, public one-level comment replies, and media attachments are implemented in the web app; migrations `0004`, `0005`, and `0007` are required before database-backed verification. TypeScript checking passes. The production build is currently blocked by a Next.js route-segment export in the concurrent Marketplace work (`apps/web/src/app/marketplace/[id]/page.tsx`), so the Anonymous changes are not yet build-verified. Comment mentions and full acceptance testing remain outstanding.
- **Phases 2–11 — Not yet assessed.** Inspect existing features before changing them; do not mark a phase complete based on this status note.
- **Phase 12 — Deferred by roadmap order.** React Native Anonymous work was started earlier and is currently partial. Its TypeScript check passes and the Expo web preview boots, but the missing `EXPO_PUBLIC_SUPABASE_URL` blocks identity setup and end-to-end validation. Resume the port only after Phases 1–11 are complete, preserving that work and the existing mobile UI.
- **Next work:** apply and verify the Anonymous feed, comment, and media migrations; resolve the Marketplace build blocker without disturbing that agent's work; then complete comment mentions and Phase 1 acceptance testing before moving to Phase 2.

## GLOBAL UI AND DESIGN RULES
These rules apply to every existing and new screen across the Next.js web application and React Native application.

### Preserve Existing UI

- Inspect the existing UI before changing anything.
- Preserve the current Anonymous UI. Do not redesign, replace, or restyle it unnecessarily.
- Preserve the existing profile, settings, Room, marketplace, and other UI patterns.
- New screens and components must follow the existing visual language, spacing, colours, cards, icons, navigation, and interaction patterns.
- Extend existing components where possible instead of creating visually inconsistent alternatives.
- Do not replace an existing design with a new design merely because a roadmap description suggests a different style.
- If the existing UI already satisfies a requirement, keep it and implement only the missing functionality.

### Typography

- Use small, compact, readable fonts throughout the UI.
- Avoid oversized headings, oversized labels, and excessive text scale.
- Use regular or medium font weights by default.
- Avoid very bold text unless it is necessary for a clear hierarchy or accessibility.
- Keep typography consistent with the existing application.

### Buttons

- Buttons must not be wider than the text or content they contain unless the existing design specifically requires a full-width action.
- Use compact buttons with appropriate horizontal padding.
- Avoid unnecessarily long button labels.
- Do not make every action a large full-width button.
- Preserve the existing button style, radius, colour, and spacing.
- Ensure buttons remain accessible and easy to tap on mobile.

### Responsive Behaviour

- Preserve the existing responsive patterns.
- Ensure new UI works on small screens without oversized controls.
- Avoid unnecessary layout changes on existing screens.
- Maintain accessible contrast, readable text, and usable touch targets.

# PHASE 1 — COMPLETE THE ANONYMOUS FEATURE IN NEXT.JS
Finish the existing Anonymous frontend and implement the necessary backend functionality in Next.js without changing the existing Anonymous UI unnecessarily.

## Public Anonymous Feed

- Display public anonymous posts using the existing Anonymous UI.
- Implement likes and accurate like counts.
- Implement comments, replies, and accurate engagement counts.
- Implement sharing and report actions.
- Support existing text and media-post functionality.
- Use infinite scrolling rather than pagination controls.
- Ensure infinite scrolling continues loading content until the server has no more eligible content.
- Do not impose an arbitrary small page limit that makes the feed appear to end prematurely.
- Use cursor-based loading where possible.
- Prevent duplicate requests while a request is already in progress.
- Prevent duplicate posts when appending new results.
- Preserve the current scroll position when new content is loaded.
- Display a loading indicator while more content is being fetched.
- Display an end-of-feed state only when the backend explicitly confirms that there is no more content.
- Do not display an end-of-feed message merely because one request returned fewer items than expected.
- Support retrying failed infinite-scroll requests.
- Include loading, empty, error, and retry states using the existing UI patterns.
- Ensure deleted, hidden, blocked, or ineligible content is handled correctly.
- Ensure the feed can continue loading after a temporary request failure.

## Anonymous Feed Infinite Scrolling Requirements
Implement infinite scrolling carefully on both the frontend and backend.

### Frontend

- Track the current cursor or continuation token.
- Request the next batch only when the user approaches the end of the currently loaded content.
- Prevent concurrent duplicate requests.
- Ignore stale responses when a newer request has already completed.
- Deduplicate posts by stable post ID.
- Preserve the existing feed layout and card design.
- Do not reset the entire feed unnecessarily after likes, comments, reports, or other interactions.
- Refresh the feed only when explicitly requested or when the existing application pattern requires it.
- Show a compact loading state consistent with the existing Anonymous UI.
- Show a compact end-of-feed state only when `hasMore` is false or the backend returns no continuation cursor.
- Handle an empty first response separately from reaching the end after previously loaded content.

### Backend

- Prefer cursor-based pagination over offset pagination for the Anonymous feed.
- Return a stable continuation cursor or equivalent `nextCursor`.
- Return an explicit `hasMore` value where appropriate.
- Apply consistent ordering so posts are not skipped or repeated between requests.
- Filter deleted, hidden, moderated, blocked, and otherwise ineligible content before returning results.
- Ensure the cursor cannot be manipulated to access unauthorised content.
- Avoid loading the entire Anonymous feed into memory.
- Add appropriate database indexes for feed ordering and filtering.
- Ensure the backend can continue returning content beyond the first batch.
- Test feeds containing more records than one or two batches.
- Test duplicate prevention, cursor progression, deleted content, and concurrent requests.

## Personal Anonymous Messages

- Allow users to create a personal anonymous-message link.
- Support copying and sharing the link externally.
- The personal anonymous-message link must open on the web version of Common Room.
- The link should use a stable public web URL that visitors can open in a browser without needing the mobile application.
- If a visitor opens the link from a mobile device, it should still open the web version.
- Do not require the visitor to install the app to submit a message.
- Support appropriate deep-link or browser handling without changing the existing Anonymous UI unnecessarily.
- Allow visitors to submit anonymous messages through the link.
- Build the web UI where visitors type and submit their anonymous messages.
- Use the existing colourful Anonymous Messages UI as the design reference and preserve its current visual pattern.
- Do not create a completely new visual design for the message-submission page.
- Reuse existing Anonymous cards, colours, spacing, typography, input styles, buttons, icons, and feedback states.
- Keep the message input compact, readable, and consistent with the existing Anonymous UI.
- Use small fonts and regular or medium font weights.
- Keep the submit button compact and no wider than its text unless the existing Anonymous layout requires otherwise.
- Display validation, loading, success, and error states using the existing Anonymous UI patterns.
- Prevent duplicate submissions.
- Clear or preserve the input according to the existing product behaviour after successful submission.
- Display received messages in the recipient’s Inbox.
- Allow recipients to open messages, view replies, and see conversation history.
- Support multiple replies where appropriate.
- Allow recipients to intentionally share a selected message or reply publicly.
- Never publish private messages automatically.
- Keep personal anonymous messages separate from public anonymous posts in the data model and permissions.

## Anonymous Message Link Requirements

- Generate a public web URL associated with the recipient’s message inbox.
- Do not expose the recipient’s private account ID in the public URL.
- Use a safe public identifier or token.
- Validate that the link is active before accepting a message.
- Allow the recipient to disable or regenerate the link if that functionality fits the existing settings pattern.
- Do not reveal the sender’s identity to the recipient.
- Do not reveal private recipient information to the visitor.
- Rate-limit submissions.
- Add spam prevention and abuse controls.
- Return clear success and failure responses without exposing sensitive information.
- Test opening the link while logged out.
- Test opening the link on desktop and mobile browsers.
- Test submitting a message without an account.
- Test invalid, disabled, expired, and regenerated links.
- Test repeated submissions and rate limits.
- Test that the recipient can see the message in the Inbox after submission.

## Privacy and Safety

- Do not expose a sender’s identity to the recipient when the feature promises anonymity.
- Restrict access so users can view only messages and conversations they are authorised to access.
- Implement reporting, blocking where appropriate, rate limiting, spam prevention, and moderation controls.
- Protect sensitive metadata and restrict access to internal moderation information.
- Test privacy and authorisation rules, including attempts to access another user’s messages.
- Do not expose private message content through public feed APIs.
- Do not use private message content for public recommendations.
- Do not reveal internal moderation metadata to ordinary users.

## Anonymous UI

- Keep the public feed and personal Inbox as distinct experiences.
- Preserve the existing Anonymous UI.
- Use the existing colourful Anonymous Messages UI for the public web message-submission page.
- Do not redesign the Anonymous feature unless a specific usability or accessibility issue requires a targeted change.
- Maintain the existing compact typography and button patterns.
- Keep new controls visually consistent with existing Anonymous controls.

# PHASE 2 — COMPLETE ROOM
Build and polish the main Room social feed while preserving the existing Room UI patterns.

## Feed Experience

- Implement a TikTok-style vertical, swipeable feed where this already matches the existing product direction.
- Support video, image, and text posts.
- Implement the existing For You, General, and relevant trending or discovery sections.
- Ensure feed content loads efficiently.
- Use infinite scrolling where the feed is intended to continue indefinitely.
- Do not show an end-of-feed state unless the backend confirms that no more content exists.
- Use cursor-based loading where appropriate.
- Prevent duplicate requests and duplicate posts.
- Handle video playback, media loading, errors, and unavailable posts.
- Maintain a responsive interface and accessible interaction controls.
- Preserve the existing Room visual design, typography, spacing, and component patterns.

## Social Interactions

- Implement likes and accurate like counts.
- Implement comments and threaded replies.
- Implement accurate comment and reply counts.
- Implement post sharing and shareable post links.
- Add reporting and appropriate content controls.
- Prevent duplicate likes, duplicate interactions, and inconsistent counts.
- Ensure deleted posts and comments are removed or updated throughout the relevant interface.
- Preserve the existing interaction controls and avoid replacing them with oversized buttons.

## Feed Performance

- Avoid loading every post at once.
- Use cursor-based infinite scrolling where appropriate.
- Avoid unnecessary database queries and repeated requests.
- Optimise media loading and video playback.
- Provide compact loading states, empty states, error messages, and retry actions.
- Ensure a temporary loading failure does not permanently stop infinite scrolling.

# PHASE 3 — RECOMMENDATION SYSTEMS
Implement separate recommendation systems for Room and Anonymous.

Do not attempt to reproduce the complete internal systems of TikTok, Instagram, or YouTube. Build a practical, configurable recommendation pipeline that can evolve as real usage data becomes available.

## Room Recommendations
Consider:

- User interests and selected preferences.
- Posts and creators the user has interacted with.
- Video watch duration and completion rate.
- Likes, shares, saves, and meaningful comments.
- Post freshness.
- Content relevance.
- Repeated skips and negative feedback.
- Creator and content diversity.
- Opportunities for new creators and new posts to receive exposure.
Use different scoring logic for video, image, and text content where appropriate.

## Anonymous Recommendations
Implement distinct logic for:

- Hot posts.
- Trending posts.
- Fresh content discovery.
- Relevant topics and content formats.
- Genuine conversation quality.
- Diversity and discovery.
- Safety and moderation eligibility.
Trending should consider the rate of engagement growth, not just total likes. Hot should account for recent engagement and freshness.

Never expose anonymous identities or use private message content to reveal who submitted a message. Do not reward harassment, outrage, or spam.

## Initial Ranking Architecture

- Begin with configurable database-driven scoring.
- Keep scoring weights and ranking rules adjustable.
- Filter ineligible content before ranking.
- Deduplicate posts and avoid excessive repetition.
- Apply diversity and new-content discovery adjustments.
- Track recommendation impressions and outcomes.
- Avoid counting repeated impressions as independent engagement without appropriate controls.
- Introduce machine learning only when sufficient reliable data exists.

## Event Tracking
Record useful product events, including:

- Post impression.
- Post open.
- Video watch duration.
- Video completion.
- Like.
- Comment.
- Reply.
- Share.
- Save.
- Skip.
- Not interested.
- Report.
- Search performed.
- Anonymous message-link opened.
- Anonymous message submitted.
- Anonymous message reply created.
Where applicable, record a unique event ID, user ID or anonymous session identifier, content ID, timestamp, and relevant context. Validate and deduplicate events.

Do not record anonymous-message content in analytics events.

# PHASE 4 — POST CREATION AND MEDIA UPLOADS
Review the existing post-creation flow and improve it rather than rebuilding it unnecessarily.

- Polish the existing create-post UI.
- Support the existing content types.
- Improve image and video selection and upload flows.
- Add captions and other existing post metadata.
- Validate content before submission.
- Display upload progress where practical.
- Handle upload failures and retries.
- Prevent accidental duplicate submissions.
- Ensure permissions and file validation are enforced on the server.
- Verify that uploaded media appears correctly in feeds and on profiles.
- Ensure deleting a post updates all relevant views and records.
- Preserve the existing create-post layout, typography, button sizing, and interaction patterns.

# PHASE 5 — MARKETPLACE
Build a functional student marketplace focused on listings while maintaining the existing marketplace UI pattern.

## Listings

- Create, view, edit, and delete listings.
- Support listing images.
- Store title, description, price, category, location, seller, and listing status.
- Display listing details.
- Allow sellers to mark items as sold or unavailable.
- Handle expired or removed listings appropriately.
- Preserve existing marketplace cards, spacing, typography, and compact controls.

## Discovery

- Implement keyword search.
- Add category, price, and location filters.
- Support sorting by relevance, newest, and price.
- Support location-aware discovery where the user has provided the necessary information or permission.
- Add saved or liked listings.
- Allow users to view seller profiles and contact sellers through the supported communication flow.
- Use infinite scrolling for long listing results where appropriate.
- Do not show an end-of-results state until the backend confirms that no more listings exist.

## Recommendations
Initially rank listings using:

- Search relevance.
- Category relevance.
- Location.
- Freshness.
- Saved listings and likes.
- Previous searches and listing interactions, where available.
Keep personalisation useful without preventing users from discovering unfamiliar categories or sellers.

## Marketplace Safety

- Add listing reports.
- Add administrative listing moderation.
- Prevent unauthorised edits or deletion of other users’ listings.
- Validate listing content and uploaded files.
- Provide clear states for sold, unavailable, removed, and expired listings.

# PHASE 6 — USER PROFILES, SETTINGS, AND PREFERENCES
Build the complete user profile system while preserving the existing profile and settings UI patterns.

Do not redesign existing profile or settings screens unnecessarily. Extend the current layout, components, typography, spacing, colours, and navigation.

## A. Public Profile
Implement:

- Profile picture.
- Display name.
- Username and unique username rules.
- Bio.
- Optional school or education information, respecting privacy preferences.
- Public posts and relevant content history.
- Common Room status title.
- Earned badges and achievements.
- Follower/following information if following is supported by the existing product design.
- Profile sharing.
- Edit-profile controls for the profile owner.
- Appropriate report and block actions on other users’ profiles.
Use small, readable fonts and avoid overly bold profile headings. Keep profile action buttons compact and no wider than their text unless the existing profile layout requires otherwise.

Do not display private account information on public profiles.

## B. Profile Picture and Media Management

- Allow users to upload or change their profile picture.
- Support selecting a new image and previewing it before saving.
- Validate image formats and file sizes.
- Show upload progress, errors, and retry options.
- Provide a default avatar when no picture is available.
- Support removing or replacing an existing picture.
- Ensure the saved picture appears consistently across Room, Anonymous-related profile areas where applicable, comments, and other authorised surfaces.
- Do not expose private storage paths or credentials.
- Preserve the existing avatar, upload, preview, and save UI patterns.

## C. Profile Editing
Allow users to edit supported profile information, including:

- Display name.
- Username, subject to availability and validation.
- Bio.
- Profile picture.
- School or education status, where applicable.
- Other existing profile fields.
Validate user input and prevent unauthorised modification of another user’s profile.

Use the existing profile-editing layout. Do not introduce oversized labels, heavy font weights, or unnecessarily wide buttons.

## D. Account Settings
Create or complete a dedicated settings area using the existing settings UI pattern.

### Account

- View and update account information.
- Change supported account details.
- Manage account verification where implemented.
- Log out.
- Request account deletion.
- Provide appropriate confirmation before destructive actions.

### Privacy

- Manage public profile visibility where supported.
- Control visibility of optional profile information.
- Manage supported interaction and messaging permissions.
- Provide blocking controls.
- Explain anonymous-message privacy clearly.
- Never imply that hiding a public profile makes all backend activity invisible to authorised safety systems.

### Notifications

- Manage supported push and in-app notification preferences.
- Allow users to configure notification categories where implemented.
- Respect saved preferences when sending notifications.
- Provide sensible defaults.

### Feed and Content Preferences

- Manage content interests.
- Provide supported controls such as Not Interested.
- Manage relevant recommendation preferences.
- Allow users to update school or education information where applicable.
- Do not force a school selection on users who have not entered school.

### App Preferences

- Theme and appearance settings where supported.
- Language or regional preferences where supported.
- Accessibility-related preferences where practical.
- Data usage or media playback preferences where appropriate.
- Other preferences that fit the existing application.
Do not add non-functional settings switches. Every implemented setting must have a clear effect, persist appropriately, and be respected by the application.

Keep settings controls compact and consistent with the existing UI. Avoid making every setting action a full-width button.

## E. Account Security

- Secure authentication and session handling.
- Appropriate password or sign-in credential management for the chosen authentication method.
- Secure account recovery where supported.
- Authorisation checks for sensitive actions.
- Clear handling of expired sessions.
- Confirmation for important account changes.
- Never expose authentication tokens or sensitive account data in public API responses.

## F. Profile and Settings Testing
Test:

- Profile creation and updates.
- Username availability and validation.
- Profile picture upload, replacement, and failure cases.
- Persistence after logout and login.
- Public versus private field visibility.
- Notification and preference persistence.
- Account deletion and its documented consequences.
- Access control and attempts to modify another user’s data.
- Consistency with existing profile and settings UI patterns.
- Responsive behaviour on small screens.

# PHASE 7 — COMMON ROOM STATUS AND LEADERBOARDS
Build the individual recognition system while preserving the existing profile and leaderboard UI patterns.

Rank people based on their individual contributions across Common Room, not by ranking their campuses.

## Recognition Titles
Implement a configurable progression based on the final agreed title order, including:

- Common Man.
- Common Chancellor.
- Common Senator.
- Common President.
Keep the progression configurable until the final thresholds and eligibility rules are approved.

## Ranking Signals
Consider:

- Genuine engagement with original content.
- Meaningful comments and replies.
- Shares and other valuable interactions.
- Consistent participation.
- Positive community contributions.
- Game achievements where relevant.
Do not calculate status using raw engagement totals alone. Apply anti-spam controls, duplicate-event handling, abuse detection, and appropriate weighting.

## Leaderboards and Badges

- Individual platform-wide leaderboards.
- Creator recognition.
- Meaningful community-contribution recognition.
- Relevant game achievements.
- Profile badges and title display.
- Periodic ranking updates.
- Clear rules describing how users earn recognition.
Do not make school-versus-school rankings the primary leaderboard. Do not reveal anonymous identities or connect public recognition to private anonymous activity.

Use compact cards, small fonts, and restrained font weights consistent with the existing UI.

## Recognition Data
Store authoritative ranking results in the application database. Make scoring configurable, auditable, and resistant to manipulation.

# PHASE 8 — ANALYTICS
Integrate Firebase Analytics or an appropriate product analytics solution.

Use analytics to understand:

- Registration and onboarding completion.
- Active users and retention.
- Feed impressions and engagement.
- Video viewing behaviour.
- Anonymous link creation and sharing.
- Anonymous web-link opens.
- Anonymous message submission and replies.
- Marketplace searches and listing interactions.
- Profile completion.
- Feature adoption.
- Reports and moderation trends.
- Conversion through relevant product flows.
Use appropriate privacy practices, consent requirements, event validation, and data minimisation.

Important distinction:

- Product analytics measures usage and behaviour.
- The application database stores authoritative application records.
- The backend calculates recognition titles, leaderboard results, engagement totals, and other product-critical values.
- Firebase Analytics must not be the only source of truth for user records, posts, comments, likes, messages, or Common Room status.
- Do not send private anonymous-message content to analytics services.

# PHASE 9 — ADMIN DASHBOARD AND MODERATION
Build a secure administration area before public launch.

Preserve the existing admin UI pattern where one exists. Use compact typography, regular or medium font weights, and compact action buttons.

## User Management

- Search and view registered users.
- Inspect relevant account and moderation information.
- View account status.
- Suspend, restrict, or ban accounts according to authorised moderation rules.
- Handle account appeals or support requests where implemented.
- Use paginated or cursor-based user searches.
- Do not load the entire user directory into memory at once.

## Content Moderation

- Review reported posts, comments, and marketplace listings.
- Remove or restrict inappropriate content.
- Delete comments when justified.
- Track report status and moderation outcomes.
- Prevent removed content from reappearing in recommendations.
- Provide a clear moderation history.

## Anonymous Safety

- Investigate anonymous-content reports using authorised internal tooling.
- Restrict access to sensitive metadata.
- Never expose sender identities to ordinary users.
- Log sensitive administrative access and actions.
- Apply least-privilege access controls.
- Protect anonymous-message link and submission metadata.

## Complaints and Feedback

- Display user complaints and feedback.
- Allow authorised staff to respond.
- Track status and resolution.
- Prevent unauthorised access to private support information.

## Announcements

- Create and publish platform announcements.
- Support appropriate in-app announcement placement.
- Record who published or edited an announcement.
- Validate announcement content.

## Content Management

- View platform content.
- Manage approved featured posts.
- Upload or schedule approved content.
- Support bulk content management with validation, previews, and error reporting.
- Maintain clear account ownership and content provenance.

## Analytics Dashboard
Show useful operational metrics:

- Registered users.
- Active users.
- Posts and comments.
- Engagement and retention.
- Marketplace activity.
- Reports and moderation workload.
- Errors and operational health where available.

## Audit and Security

- Role-based admin permissions.
- Secure administrator authentication.
- Audit logs for sensitive actions.
- Protection against privilege escalation.
- Server-side authorisation.
- Safe handling of user data.
- No privileged credentials in client-side code.

## User Directory and Authentication Provider
The admin dashboard must not assume that an authentication provider is the complete application database.

Maintain application records for profiles, preferences, posts, comments, listings, reports, messages, and recognition data. If the application uses Firebase Authentication, retrieve authentication users through the appropriate administrative interface and reconcile them with application records.

Implement paginated or cursor-based user searches and avoid loading the entire user directory into memory at once.

# PHASE 10 — LAUNCH CONTENT AND SEEDING
Prepare Common Room for a launch that does not feel empty.

- Recruit real student creators.
- Encourage creators to share original content on Common Room in addition to their existing social platforms.
- Prepare a library of approved original content.
- Establish content categories and a publishing schedule.
- Prepare onboarding and community guidelines.
- Use clearly identified platform-managed or editorial accounts where appropriate.
- Use generated accounts for development and staging tests.
- Never impersonate real students or misrepresent fake users as genuine community members.
- Do not copy or repost creators’ copyrighted content without permission.
- Test the experience with a limited group before opening it to a larger audience.
- Ensure the public Anonymous message-link flow is tested from external browsers before launch.
- Ensure the web message-submission page uses the existing colourful Anonymous Messages UI.
Ensure that moderation, reporting, and operational support are ready before increasing user acquisition.

# PHASE 11 — TESTING, POLISH, AND DEPLOYMENT

## Functional Testing

- Authentication and onboarding.
- Room feed and social interactions.
- Room infinite scrolling.
- Anonymous feed, infinite scrolling, links, messages, and replies.
- Anonymous web message-link opening.
- Anonymous web message submission.
- Anonymous message validation, rate limiting, and duplicate prevention.
- Post creation and media uploads.
- Marketplace listings and search.
- Marketplace infinite scrolling where applicable.
- Profiles and profile pictures.
- Account settings and preferences.
- Recognition and leaderboard calculations.
- Admin dashboard and moderation.
- Analytics event collection.

## Infinite Scrolling Testing
Test every infinite-scroll feed and result list with:

- More records than one response batch.
- Exactly one response batch.
- No records.
- A final partial batch.
- A backend response with `hasMore: false`.
- A backend response with no continuation cursor.
- Temporary request failure.
- Retry after failure.
- Slow network conditions.
- Rapid scrolling.
- Concurrent scroll events.
- Duplicate responses.
- Deleted or hidden records between requests.
- Refresh while a next-page request is active.
- Returning to the screen after navigating away.
- Stable ordering and cursor progression.
Do not mark infinite scrolling complete unless it can continue loading all available content and stops only when the backend confirms that no more content exists.

## Security and Reliability

- Verify authorisation and privacy rules.
- Test cross-user access attempts.
- Validate uploads and user input.
- Test rate limits and abuse prevention.
- Check pagination and cursor performance.
- Test failed requests, retries, and network interruptions.
- Verify database backups and recovery procedures.
- Protect secrets and production credentials.
- Review logging for accidental exposure of sensitive information.
- Test anonymous-message privacy and link security.

## UI and Design Testing

- Confirm existing Anonymous UI has not been unnecessarily redesigned.
- Confirm existing profile and settings patterns are preserved.
- Confirm new Anonymous web message-submission UI matches the existing colourful Anonymous Messages UI.
- Confirm fonts remain small and readable.
- Confirm text is not unnecessarily bold.
- Confirm buttons are compact and not wider than their text unless a full-width action is intentionally required.
- Confirm layouts work on small screens.
- Confirm loading, empty, error, success, and end-of-feed states match existing patterns.
- Confirm accessibility and contrast remain acceptable.

## Deployment

- Configure production environment variables.
- Configure hosting, database access, storage, and domain settings.
- Set up error monitoring and operational alerts.
- Confirm backups and recovery procedures.
- Test production authentication and media delivery.
- Verify mobile responsiveness and accessibility.
- Verify the public Anonymous message link opens the web version.
- Run a controlled launch and monitor real user behaviour.

## Post-Launch

- Fix critical issues first.
- Review retention, engagement, and moderation metrics.
- Improve recommendation quality using observed behaviour.
- Refine the UI based on user feedback without unnecessarily changing established patterns.
- Avoid adding major new features until the core experience is stable.

# PHASE 12 — REACT NATIVE FRONTEND PORT USING EXPO
This phase must happen after the Next.js frontend and its associated functionality have been completed and tested.

The goal is to provide the same Common Room experience in the existing React Native application, using Expo where appropriate.

The React Native application must preserve the existing mobile UI patterns. Do not redesign existing mobile screens unnecessarily.

## A. Inspect the Existing React Native Project

- Inspect the current React Native codebase and dependencies.
- Identify existing working screens, navigation, authentication, components, and integrations.
- Preserve useful native functionality.
- Identify the Next.js pages and components that must be recreated in React Native.
- Identify which existing mobile UI patterns must be preserved.

## B. Port the Complete Frontend
Port the completed Next.js frontend to React Native, feature by feature.

Include:

- Anonymous feed and Inbox.
- Personal anonymous links and message flows.
- Room feed and content interactions.
- Post creation and uploads.
- Marketplace and listing details.
- User profiles and profile editing.
- Profile pictures.
- Account settings and preferences.
- Recognition titles, badges, and leaderboards.
- Notifications and other completed frontend features.
- Appropriate loading, empty, error, and offline states.
- Infinite scrolling for feeds and long result lists.
The public anonymous-message link must continue to open the web version. The React Native application may provide a share action for the link, but the visitor-facing message-submission page remains a web experience.

Do not omit screens simply because they were added late in the Next.js implementation.

## C. Important: Translate the UI, Do Not Blindly Paste Web Code
Use the Next.js frontend as the reference implementation for layout, visual design, behaviour, validation, and user flows.

Do not copy browser-specific JSX, CSS, DOM elements, or web-only APIs directly into React Native and assume they will work.

Recreate the screens using appropriate React Native components and styling. Preserve the design and behaviour while adapting the implementation to the native platform.

Examples:

- Use React Native views and text components instead of HTML elements.
- Translate web styles into React Native-compatible styles.
- Adapt navigation to the existing React Native navigation architecture.
- Replace browser-only file inputs with supported native image and media pickers.
- Use appropriate Expo modules for supported native capabilities.
- Adapt video playback, sharing, deep links, notifications, and permissions for mobile.
- Use suitable native-compatible icon, image, and animation libraries.
- Preserve small fonts, restrained font weights, compact buttons, and existing mobile UI patterns.
Install or update Expo dependencies only when needed, using compatible versions for the project’s Expo SDK. Do not add arbitrary imports or incompatible packages.

## D. Shared Behaviour and API Integration

- Keep both frontends consistent in their API contracts and business rules.
- Connect React Native to the same authoritative backend and data model used by the Next.js application.
- Reuse shared validation rules, types, and business logic where the architecture permits.
- Avoid duplicating ranking logic in the mobile client.
- Keep authentication, permissions, and sensitive operations enforced by the server.
- Do not implement a second independent backend or separate competing application databases.
- If any feature depends on web-only functionality, document the required mobile equivalent.
- Ensure infinite-scroll cursors and continuation behaviour are consistent across both frontends.

## E. Native Quality

- Ensure layouts work across supported screen sizes.
- Support safe areas, keyboard behaviour, gestures, and mobile navigation.
- Test image selection, uploads, video playback, sharing, and deep links.
- Verify push notification integration where implemented.
- Handle permissions and denied permissions gracefully.
- Test loading, failures, network interruptions, and session expiry.
- Preserve the intended Common Room design system and interactions.
- Keep text small and readable without making it inaccessible.
- Avoid unnecessarily bold text.
- Keep buttons compact and no wider than their text unless a full-width action is intentionally required.

## F. React Native Acceptance Criteria
The React Native application must provide the same completed feature set as the Next.js application, adapted appropriately to mobile.

For each feature:

1. Verify the equivalent screen exists.
2. Verify the core interactions work.
3. Verify the feature connects to the correct backend endpoints.
4. Verify data persists and appears consistently across both frontends.
5. Test permissions, privacy, and error handling.
6. Test infinite scrolling and cursor continuation where applicable.
7. Confirm the existing mobile UI pattern has been preserved.
8. Document any platform-specific differences.
Do not mark the port complete just because the screens render. Functionality, API integration, infinite scrolling, privacy, and tests must also pass.

# DEFERRED FEATURES

- Keep Meet on hold until the core platform is stable.
- Keep Word Puzzle as the only working game initially.
- Leave Trivia, Truth or Dare, and School Life under development.
- Introduce additional games gradually after launch and validation.
- Do not add unapproved major features to the roadmap without updating this plan.

# GLOBAL ENGINEERING RULES

1. Inspect before modifying.
2. Preserve existing working code and UI.
3. Do not redesign the existing Anonymous UI unnecessarily.
4. Preserve existing profile, settings, Room, marketplace, and mobile UI patterns.
5. Follow the phase order and dependencies.
6. Keep components modular and reusable.
7. Avoid giant components and unnecessary duplication.
8. Keep API contracts, validation, authentication, and authorisation explicit.
9. Use cursor-based infinite scrolling for feeds and long lists where appropriate.
10. Do not show an end-of-feed state until the backend confirms that no more content exists.
11. Prevent duplicate requests, duplicate records, stale responses, and cursor errors.
12. Separate mock data from production data.
13. Never hard-code production secrets or privileged credentials.
14. Never trust client-provided engagement counts, permissions, or ranking scores.
15. Use database transactions and consistency controls where necessary.
16. Add automated tests for critical business logic, infinite scrolling, privacy, and security rules.
17. Implement real functionality for every visible control; do not leave inert buttons or fake settings.
18. Maintain a consistent, responsive, accessible design.
19. Use small, readable fonts throughout the UI.
20. Avoid unnecessarily bold text.
21. Keep buttons compact and no wider than their text unless a full-width action is intentionally required.
22. Keep user privacy and anonymous-content safety central to implementation.
23. Ensure anonymous-message links open the web version.
24. Ensure the public anonymous-message submission page uses the existing colourful Anonymous Messages UI.
25. Document environment variables and setup instructions without committing secrets.
26. After each phase, report completed work, tests run, remaining tasks, blockers, and deviations from the plan.
27. Update `plan.md` as tasks are genuinely completed, but preserve this roadmap’s scope and ordering.
28. Do not silently skip requirements. If a requirement cannot be completed, explain the blocker and leave it explicitly outstanding.

# DEFINITION OF DONE
Common Room is ready for its initial launch when:

- Anonymous and Room work end to end.
- Existing Anonymous UI remains intact unless a targeted functional or accessibility improvement is required.
- The public Anonymous feed uses reliable infinite scrolling and does not stop prematurely.
- Room feeds and applicable marketplace lists use reliable infinite scrolling.
- Posting, comments, replies, likes, sharing, and counts work correctly.
- Recommendation systems have a tested initial implementation.
- Personal anonymous-message links open the web version.
- Visitors can submit anonymous messages through the public web link.
- The anonymous-message submission page uses the existing colourful Anonymous Messages UI.
- Anonymous messages remain private and separate from public anonymous posts.
- Marketplace listings and search work.
- Profiles, pictures, settings, and preferences persist correctly.
- Existing profile and settings UI patterns are preserved.
- Fonts remain small and readable, text is not unnecessarily bold, and buttons remain compact.
- Recognition titles are calculated using trusted backend data.
- Admins can manage users, reports, content, and complaints securely.
- Analytics provides useful, privacy-conscious product measurements.
- Moderation and safety controls are operational.
- The Next.js application has been tested and deployed.
- The completed frontend has been ported to React Native using Expo-compatible implementations.
- Both frontends work with the same authoritative backend and application data.
- Important flows have been tested on web and mobile.
- Production configuration, monitoring, backups, and recovery procedures are in place.
Treat this document as the authoritative development roadmap and replace the existing `plan.md` accordingly.