# Common Room: product plan v1 (for review)

> **Superseded for reading by the illustrated page:** https://claude.ai/artifact/CL56tYUCmfb1rJTrsaQVHv
> That page also adds: Instagram login removed (Google, TikTok, Apple only), the **Pro** tier (opt-in hints and ask-to-reveal instead of true unmasking, because of the FTC action against NGL), and the Climb / Ultimate / Legend / Gods level journeys. This file is kept as the longer written reference.

Status: draft for the founder to review. Nothing in here is built yet unless it says "built". Each section ends with **Decisions needed**. Things I could not verify are marked **(verify)**.

Contents
1. What the product is
2. Navigation and the Room/Home merge
3. Anonymous feed
4. Identity: Anonymous IDs, real accounts, student status
5. Onboarding in 30 seconds
6. Photos and short video
7. Community Rooms
8. Marketplace
9. Sharing and the growth loop
10. Moderation and community rules
11. Analytics and post insights
12. Advertising (self-serve, "Sponsored")
13. Levels (the 2go idea)
14. Admin on its own subdomain
15. Logo
16. User targets for month one
17. Build order and what blocks it
18. Risks and honest caveats
19. Sources

---

## 1. What the product is

An NGL-style anonymous campus app on the web first. The loop that makes NGL spread: someone shares a link, friends open it **without logging in**, send an anonymous message, then want their own link. Common Room adds an anonymous feed, community Rooms, and a marketplace on top of that loop.

Three rules that decide most questions below:
1. **Reading never needs an account.** Anyone with a link lands on the content.
2. **Anonymous actions need a Anonymous ID only** (Ghost 12, Ghost 56). One tap, no email.
3. **Anything tied to a real person needs a real account:** posting under your name in Room, Market listings, ads, and following people / getting followers.

---

## 2. Navigation and the Room/Home merge

Your latest message merges Home into Room and calls it **Room**. Proposed bottom bar (4 tabs, fewer is faster to learn):

| Tab | What it is |
|---|---|
| **Anonymous** | The anonymous feed + your Inbox. Default landing for visitors from shared links. |
| **Room** | One feed with normal posts (real profile) and anonymous posts mixed, plus Room cards (communities) on top. Replaces Home. |
| **Market** | Listings. Real profile required to sell. |
| **Me** | Profile, settings, your Rooms. |

Notes:
- The existing vertical video viewer (`RoomExperience`) should **not be deleted**. Make it a "Watch" mode inside Room (a toggle or a tab), so video stays available.
- Landing page for someone who is not logged in: **Anonymous**, because that is the viral surface.
- Feature flags (section 14) let you switch Room posts or Market off later, which matches "I will tell you when to disable it".

**Decisions needed**
- Is Anonymous or Room the default landing for returning logged-in users?
- Confirm: remove the separate "Home" tab, keep the old video viewer as "Watch" inside Room.

---

## 3. Anonymous feed

Currently built: Hot / Trending / Fresh tabs (Hot and Trending rank the loaded posts in the browser; Fresh is newest first). You said three tabs at once is too much and then said my change to two ("Hot" + "Fresh") is "not the idea". I do not know what you want, so here are the options:

| Option | Tabs | Comment |
|---|---|---|
| A | One feed, no tabs. A single ranked feed (recent + engagement) with a small "Newest" toggle in the header. | Simplest, best for first-time visitors. My recommendation. |
| B | **For you / Fresh** | "For you" is the ranked mix; Fresh is chronological. |
| C | Hot only (no sorting UI) | Least choice, risk: feels stale to returning users. |

Ranking (server-side, needed before real traffic): `score = (likes*2 + comments*3.5 + shares*4) / (age_hours + 2)^1.25`, the same decay formula already in `apps/web/TECH_NATION_ROADMAP.md`. Today's client-side ranking only ranks what was already loaded, which is wrong at scale.

Already built: infinite scroll with cursor paging (end-of-list only when the server says so), like, comments with replies, report, share, delete own post, loading / empty / error / load-more-failed states.

**Decisions needed:** which option (A/B/C), or describe what you meant.

---

## 4. Identity

| Who | Can do |
|---|---|
| Visitor with a link, no login | View posts, view a message link page, send an anonymous message (a hidden Visitor name is auto-created; this is built) |
| Visitor who picks a **Anonymous ID** | Comment, like, post anonymously |
| Real account | Everything above + post in Room under their profile, follow people and get followers, create/join Rooms, sell in Market, run ads |

"Comment as anonymous" inside Room (normal posts): allowed but **not prominent** (a small option behind a button after the user taps comment), and for guests the first prompt is sign in / sign up, as you asked.

**Names are auto-assigned**, like `quietfox4821`: word lists plus digits, 3 to 20 characters (the DB allows 3 to 24), unique ignoring case, never derived from real name, school, email, phone or sign-up time. Blocked: real people and brands (a name like `mrbeast7899` must never be generated), official-sounding names (admin, support, commonroom), offensive words (checked after removing digits and swapped letters), and digit runs with hateful or meme meaning (88, 1488, 69, 420, 666). Needs native-speaker review for Pidgin, Yoruba, Igbo, Hausa. Re-roll freely at sign-up, change once every 30 days. Two ways to post anonymously: **no name** ("Anonymous", no rank) or **auto name** (handle + Anonymous rank). **Decision:** offer both, default to the auto name for feed posts and comments, no-name for the message-link inbox.

Age: copy becomes **"I am 18 or older"** (currently "I meet the minimum age to use Common Room"). It is a self-declaration checkbox; it is not verification. Everyone is treated as an adult, which also simplifies ads.

Student status:
- After sign up or social login, ask one question: **"I'm a student" / "I'm not a student"**. Student then picks a school (searchable list already built, 100+ Nigerian institutions in `mobile/src/data/nigerianInstitutions.json`).
- Editable in profile. When someone changes to a new school, show a congratulations screen ("Congrats on your admission").
- Verified student badge is a later feature (no .edu.ng emails in Nigeria, per the roadmap doc), so v1 is self-declared and labelled that way.

**Decisions needed**
- Per-post pseudonyms in comment threads (Ghost A, Ghost B) or one stable Anonymous ID per user everywhere?
- Allow changing the Anonymous ID? (Recommendation: once a week.)

---

## 5. Onboarding in 30 seconds

Target: first useful action in under 30 seconds.

Flow for a visitor from a shared link:
1. Link opens the content. No wall. (built for message links)
2. They tap "Comment" or "Get your own link".
3. One tap Anonymous ID (auto-generated, editable later). Done: they can comment.
4. To get **their own** link they need an account: Google one-tap (1 tap) or email + password (3 fields).
5. One question: student or not (+ school if yes). Interests are optional, not forced (today's onboarding forces 3 interests; I recommend skipping that step in v1 to save time).

Changes to what is built:
- Email code: let the person in immediately and only **require verification before** posting in Room, selling in Market or buying ads. The 6-digit screen stays but is no longer a blocker. (Supabase setting "Confirm email" and our gating logic need to match; **verify** in Supabase when the new project exists.)
- Photo step becomes optional, later (profile nudge).

**Decisions needed:** OK to drop forced interests, make photo optional, and delay email verification?

---

## 6. Photos and short video

### Photos
Compress in the browser before upload (already built: `compressMedia`). Add: max 4 photos per anonymous post; strip EXIF/GPS location from every upload (privacy-critical on an anonymous app, and **not done yet**).

### Video: length
WhatsApp Status length, from the sources I found (secondary sources, **verify in the app**): 30 seconds was the old limit, 60 seconds the later standard, and reports of 90 seconds rolling out from 2025. Policing "anything WhatsApp does" means a moving target, so I recommend you set our own cap:

- **v1: 15 seconds.** Cheap to store, quick to moderate, hard to abuse.
- Raise to 30 later once moderation is working.

### Video: size
"Under 500 KB for 15 seconds without losing quality" does not work, and I would rather say that now than let you promise it. My arithmetic (estimate, test it before committing): 500 KB is about 4,000 kilobits over 15 s, around 270 kbps total including audio. At that rate a 15 s clip is blocky unless it is very small (around 360p) or very simple. A realistic budget:

| Quality target | Resolution | Typical size for 15 s |
|---|---|---|
| Hard cap per upload | 540p, H.264/AAC | up to ~1.5 MB |
| "Small" tier | 480p | ~800 KB |
| What 500 KB gets you | 360p | ~500 KB, visibly soft |

Recommendation: **cap at 1.5 MB, target ~1 MB.** Compress on the device (WebCodecs; ffmpeg.wasm as fallback, which is slow and heavy on cheap phones) and verify duration and size **on the server** too. Transcode on the server later if client compression proves unreliable on low-end Android.

### Video: moderation
Because it is anonymous, video is the highest-risk feature. Rules:
- Videos from **new accounts and Anonymous IDs** are held for automated scan before showing.
- Auto-generate a blurred poster frame and run the same image classifier on 3 frames.
- Autoplay is muted. Explicit-tagged video never autoplays.

**Decisions needed:** 15 s cap OK? 1.5 MB cap OK instead of 500 KB? Include video in v1 or ship photo+text first? (My recommendation: ship v1 with photo + text, add video in the next phase once the scanner works. It is the single biggest abuse risk.)

---

## 7. Community Rooms

Rooms are user-created communities (like Facebook groups): "AAUA Room", "UNILAG Room", "Computer Science", "Nigerian Devs". You are right that fixed per-school rooms would limit you, so:

- **Seeded rooms**: one auto-created room per institution in the directory (so a student has a home on day one).
- **User-created rooms**: any real account can create a Room (name, description, cover, public / private).
- **Link cards**: Rooms appear as small cards (name, member count, Join) at the top of Room and in a "Rooms" browse screen. Share a Room link; invited people land on a preview and join after sign up.
- **General**: the main Room feed aggregates posts from all **public** Rooms you joined + General posts.
- Roles: owner, moderator, member. Owners can remove posts and members; banned from a Room is separate from site strikes.
- Posts in a Room use the author's real profile (as you said, Room posts use profile details, Anonymous does not). Anonymous posts can also be made into a Room only if the Room owner allows it (default off).
- Anti-abuse: new accounts limited to creating 1 Room per day; Room names go through the same text filter.

Backend needed (not built): `rooms`, `room_members`, `room_id` on posts, invite links, RLS. ~16 existing migrations are in `supabase/migrations`; this adds migration `0017`+.

**Decisions needed:** default join policy for school rooms (open or school-only)? Max Rooms per user at the start?

---

## 7b. People you may know

Facebook-style suggestions to help students find friends. **Real accounts only; anonymous identity is never used or revealed.**

- **Signals (strongest first, weights tuned later):** in your phone contacts, mutual followers, same Rooms, same school and level, same city (coarse), recent interaction.
- **Contacts on the web:** the Contact Picker API works only on Chrome for Android (iOS Safari and desktop: unsupported; sources conflict on a Safari flag, **verify on caniuse/MDN**). Fallbacks: upload a contacts file (vCard/CSV), type numbers, share an invite link. A native app can read contacts later.
- **Where it shows:** a "People you may know" row at the top of Room, an optional "find friends" step after sign up, the profile, and a pop-up offering contact import (after sign up, then at most weekly, "Not now" remembered). Every card has "Not interested".
- **Learning in stages:** weighted score now; friends-of-friends candidates + a ranking model trained on followed vs dismissed once there are thousands of examples; embeddings later. A complex model with no data is worse than simple weights.
- **Privacy rules (must-haves):** never reveal or use Anonymous ID; phone numbers stored only as a keyed hash (still personal data, numbers are guessable), drop non-matching numbers after 30 days, users can see and delete what they uploaded in one tap; never message a contact without the user tapping Invite; no shadow profiles for non-users; never show "you both have X's number"; blocked/reported people never suggested; location is school/city only, never GPS. **Needs a lawyer's review (Nigeria Data Protection Act, verify).**
- **Decision:** should "people who already have my number can find me" start on or off? Pop-up frequency?

---

## 8. Marketplace

Already built (UI): browse, search, categories, filters/sort, location (campus) picker, saved, my listings, detail, sold state, owner view (edit, mark sold/unavailable, delete), sell form (4 photos), report.

Rules to add:
- **Real profile required** to create a listing: real name, a school or a state/city, a verified email, 18+. Show seller profile and "member since" on every listing. (Phone is optional and used for WhatsApp/call buttons.)
- Listing expires after 30 days with a renewal reminder (the owner-view text in the mockup already says this).
- **Sponsored listings** (section 12) rank first inside related searches and categories.
- Not built: in-app chat (mockups 35-37). WhatsApp/call buttons replace it for v1.
- Safety copy: "meet in public, check before paying" is already in the contact sheet.

Backend gaps: seller profile endpoint, expiry job, contact/report abuse tracking.

---

## 9. Sharing and the growth loop

You want sharing to X, TikTok, Facebook, Instagram etc. built in, ideally without a watermark.

What the web can actually do (from the Web Share API docs, see sources):
- `navigator.share({ files })` opens the phone's share sheet with an **image or video file**. Apps like Instagram, TikTok, WhatsApp appear **only if the user has them installed and they accept that file type** (verify per device). It needs HTTPS and a tap.
- There is **no web API to post straight into TikTok or Instagram**. The only route is the OS share sheet or downloading the file.
- X, Facebook, WhatsApp, Telegram support plain **link share URLs** that work everywhere.

Plan:
1. **Share card image** (1080x1920 story size and 1080x1080) generated per post, per message-link and per Room, in the app's design. This is the actual growth lever: people post a card to their Instagram story with the link.
2. **Open Graph image** for every public link (WhatsApp/X/Facebook/Telegram previews). Next.js can generate these.
3. Share sheet buttons: Copy link, WhatsApp, X, Facebook, Telegram, Messages, "More" (device sheet with the card file), "Save image".
4. Watermark: I recommend a **small "commonroom" link line on the card, not a big logo**, because that text is how a viewer finds the app (NGL's cards carry the link). If you really want none, then the card should still contain the link text. **Decision.**

Tracking: every share link carries `?s=<channel>&r=<sharer-code>` so analytics can credit shares and sign-ups (section 11).

**Decisions needed:** small link text on cards or fully clean cards?

---

## 10. Moderation and community rules

Build this **before** public launch. Anonymous platforms attract bullying, sexual content, harassment, spam, and worse; Google Play also requires it for UGC apps: in-app **report and block for users and content**, filtering of incidental sexual content, and "robust, effective and ongoing" moderation; apps whose main purpose is objectionable content get removed (see sources; **verify the full policy text before submitting**). Apple has similar rules (**verify**).

### 10.1 Layers
1. **Prevention at post time**
   - Required choice on every post with media: **"Mark as sensitive"** (eye icon). Ticked media is blurred in feeds with "Sensitive content. Tap to view".
   - Text filter for slurs, threats, phone numbers/links (spam), self-harm phrases (route to care resources, not just removal).
   - Rate limits per account/device: posts, comments, messages (the DB already has a rate-limit function for the inbox).
2. **Automatic detection**
   - Image/video classifier on every upload (options: Google Cloud Vision SafeSearch, AWS Rekognition, or an open-source NSFW model; **verify cost and Nigerian latency**). Output: `safe`, `suggestive`, `explicit`, `violent`.
   - `explicit` = auto-hide pending review. `suggestive` = auto-blur. Anything uncertain is blurred first, reviewed after.
   - Spam heuristics: repeated text, many links, new account bursts.
   - **Child safety:** hash-matching against known-abuse lists and legal reporting duties apply the moment you host images. This needs a lawyer and a vetted vendor, not a DIY classifier. **Do not launch public image upload before this is decided.**
3. **Community reports**
   - Report on every post, comment, message, listing, Room and profile (built for posts, comments, messages, listings). Reasons list already built.
   - Reports from many different accounts auto-hide content pending review (threshold configurable in admin).
4. **Human review queue** (admin): severity-ordered, with the reason, the content, the reporter count, and one-click actions.

### 10.2 Strikes (your rule)
| Strike | Penalty |
|---|---|
| 1st | Warning + **3 days** no posting/commenting. Reading continues. |
| 2nd | **7 days** no posting/commenting. |
| 3rd | **Account ban + device ban.** |

Details I recommend:
- Strikes expire from the count after 90 days of good behaviour (so one old mistake does not ban someone forever). **Decision.**
- Severe categories (child safety, credible threats, doxxing) skip to ban immediately and are reported to authorities where required. **Needs legal advice (verify Nigerian law, NDPA obligations).**
- Every strike shows a clear notice: what rule, which content, how to appeal. Appeals go to a second reviewer.
- All actions go to an **audit log** (who, when, why).

### 10.3 Device ban: honest limits
On the web there is no reliable device ID. A "device ban" can only be a **bundle of signals**: browser fingerprint hash, IP/ASN patterns, cookie/localStorage token, and the account's email/phone. All of them can be evaded by clearing data or using another browser. So: ban the account, flag the device bundle, and **require a verified email** to post so a new account costs effort. A real device ban needs the native app (Android/iOS device IDs, still imperfect). This is a risk to your "ban their device" goal, not a reason to skip it.

Privacy: storing fingerprints and IPs is personal data under the Nigeria Data Protection Act **(verify with a lawyer)**; disclose it in the privacy policy.

### 10.4 Anonymity vs moderation
Anonymous to **other users**, not to the platform. We store the author link internally so reports can be actioned. Moderators see the real author only through a logged "reveal" with a reason (this matches the "sender metadata only for the safety role with a logged reason" rule in `plan.md`). This must be stated in the Privacy Policy ("anonymous to other users, not to Common Room").

### 10.5 Community rules document
Needs to be long and specific for Play/App Store and for moderators. Outline (I will draft it in full when you approve):
1. Who can use Common Room (18+).
2. Never allowed: sexual content involving anyone under 18; non-consensual intimate imagery; sexual solicitation; threats/violence; terrorism; hate and slurs; harassment, bullying, doxxing/sharing private info; impersonation; self-harm encouragement; illegal goods and services; scams; spam.
3. Restricted (must be tagged sensitive): nudity/artistic nudity, graphic injuries, strong language.
4. Anonymous-specific rules (no naming/shaming individuals, no "confession" posts that identify a person).
5. Marketplace rules (prohibited items, honest listings, no advance-payment pressure).
6. Rooms rules for owners and members.
7. Ads rules (section 12).
8. Enforcement: strikes, what each means, appeals.
9. Reporting, response times, law-enforcement requests.
10. Privacy summary (what we store about anonymous users).

Companion documents to write: Terms of Service, Privacy Policy, Cookie notice, Ad policy. These need a lawyer's review before launch.

**Decisions needed:** strike expiry (90 days?), immediate-ban categories, which classifier vendor/budget, who reviews reports in the first month (you? volunteers? a moderation partner?).

---

## 11. Analytics and post insights

Two audiences: **you (platform)** and **posters/advertisers (Facebook Insights-style)**.

### 11.1 Platform analytics (admin)
Events (first-party, privacy-conscious, no names): `page_view`, `click`, `share`, `signup`, `login`, `post_create`, `comment_create`, `link_open`, `message_sent`, `ad_impression`, `ad_click`.

Metrics: visits, unique visitors, clicks by element, sign-ups and funnel (visit > ghost > account > first post), total users, **DAU / WAU / MAU, average daily users**, retention (D1, D7, D30), top shared links, referral sources, traffic by country/state/city, device/browser/OS, new vs returning, time of day.

Demographics: only what people **tell us** (optional at sign up: age range and gender, 18+). Visitors who never sign up have no gender or age; **we should not guess it**. Location comes from IP geolocation at city/state level (not precise GPS). Collecting location and device data needs a consent notice **(verify NDPA obligations)**.

Build approach: write events to a Postgres table, aggregate daily into rollup tables, show in admin. Alternative: self-host PostHog for funnels so you are not building charts for a month. Recommendation: **simple event table + rollups first**, consider PostHog when funnels get complicated.

### 11.2 Post insights (for posters)
From the Facebook Insights definitions: **reach** = unique people who saw it; **impressions** = total views including repeats; **engagement** = reactions + comments + shares + clicks; **CTR** = clicks / impressions; audience breakdown by age/gender/location. Our version for each post:

| Metric | Shown to |
|---|---|
| Reach, impressions, likes, comments, shares, saves, link clicks | Post owner (anonymous posts too, via their private account; never revealed publicly) |
| Audience split: **city / school / device** (not gender for anonymous viewers) | Post owner |
| Reach over time (hourly/daily) | Post owner |

For ads add: spend, delivery status, CTR, WhatsApp clicks, call clicks, cost per click, frequency (see 12).

Privacy limit: show audience breakdowns only above a minimum count (e.g. 20 viewers) so a small number can't identify one person.

**Decisions needed:** collect optional age/gender at sign up? PostHog or own rollups?

---

## 12. Advertising (self-serve)

Self-serve is right: the advertiser creates the ad, pays, and it runs, no phone call. (You confirmed this is how it works elsewhere.)

### 12.1 Ad formats
- **Native card in the feed** (looks like a post, labelled **Sponsored** in the same place on every ad). Best result, least annoying, easiest to build.
- **Sponsored listing** in Market (ranks first in related search/category, labelled).
- Later: a banner slot (only if native cards under-deliver). No pop-ups (they hurt retention and violate store policies).
- Every ad: image or short video, headline, text, button. Buttons: **Chat on WhatsApp** (`wa.me` link), **Call** (`tel:`), or **Visit link**. Phone/WhatsApp numbers are stored on the ad and clicks counted.

### 12.2 Frequency in feeds
Config (not hard-coded): **1 ad per 7 to 15 organic posts**, randomized inside the range so it does not feel robotic, never in the first 3 posts, never two ads back to back, not next to content flagged sensitive. Default start: 1 per 10.

### 12.3 Pricing model 1 (your first model: fixed tiers)
Base tier price **₦3,000 / week**; higher tiers appear **more often** and are shown to more people. Weight example (tunable):

| Tier | Price / week | Delivery weight |
|---|---|---|
| Starter | ₦3,000 | 1x |
| Plus | ₦5,000 | 2x |
| Pro | ₦10,000 | 4x |

Within a targeting area, impressions are split by weight. Tier price is the advertiser's lever; we then **never promise a fixed reach** at the start.

**Reach claims ("reach 10k people in AAUA in 7 days for ₦3k"):** only advertise a number you can deliver. Until we have real traffic, the pop-up and dashboard should say "estimated reach" computed from our own trailing 7-day unique audience in that area × tier share, shown as a **range**, and refuse to display numbers we have not measured. Over-promising reach to paying advertisers is the fastest way to lose them. If delivery falls short, auto-extend the run ("make-good").

### 12.4 Pricing model 2 (later: budget and goal)
Advertiser picks a **budget and a goal (reach, clicks, WhatsApp chats)**, we compute estimated results and run it. At large scale this becomes a real auction:
- Each ad has a bid; eligible ads for a slot are ranked by `bid × predicted click rate × quality`; winner pays the next-highest price (second-price). Pacing spreads the budget over the schedule so it does not burn in the first hour.
- This only works once there is traffic and click data. Model 1 is correct for launch.

### 12.5 "Pay 3 weeks, get a 4th free"
A flag in admin: when an advertiser buys **3 weeks**, the campaign is created with **4 weeks** of runtime (1 week bonus). Implement it as: `paid_weeks=3, bonus_weeks=1, total_weeks=4`, stored on the order, shown in the receipt, and the end date calculated from `total_weeks`. In admin, a switch "Allow 3+1 offer" and a promo override per advertiser. All admin actions go to the audit log.

### 12.6 Targeting
Tailored by place: school, city/state, or "all Nigeria". For logged-in students use their school; for visitors use IP city. A pop-up shown to users who look like advertisers (e.g. a Market seller or a Room owner): "Reach thousands around **AAUA** this week from ₦3,000." Show at most once per week; always dismissible; the message uses the user's own school (dynamic) and an estimated range.

### 12.7 Preparing to scale (1k to 1M users)
- Ad **selection is server-side and cached**: a small "eligible ads per area" set held in Redis/memory, refreshed every minute. A feed request picks from the cache; it never queries the database per ad.
- **Impressions and clicks are batched events** (queue, then aggregate every few seconds), not one DB write per view. Count a view only when the card was on screen for a moment.
- **Delivery pacing**: each ad has a daily quota; the selector skips ads that already hit it. Frequency cap per viewer (e.g. max 3 times a day per ad) via a short-lived counter.
- **Fallback**: if no ad qualifies, show nothing (never a blank slot).
- Fraud: ignore repeated clicks from the same device within a window, ignore the advertiser's own views.
- Nothing here needs rewriting at 1M users; only the cache and queue grow.

### 12.8 Advertiser pipeline
Create ad > upload creative > pick area and tier > pay > **review (automatic checks + a human glance)** > go live > dashboard (reach, impressions, CTR, WhatsApp clicks, call clicks, spend) > renew.
- Payments: Paystack or Flutterwave (**verify** which supports your business setup). Webhook confirms payment before the ad is scheduled.
- Ad policy: no adult content, gambling (verify local rules), loans without registration, miracle claims, political ads (decide), anything violating the community rules. Nigerian ad vetting/regulatory requirements (ARCON) **(verify with a lawyer)**.
- Receipts, invoices, refunds if rejected.

**Decisions needed:** tier prices and weights; allow video ads in v1?; political ads allowed?; payment provider; who approves ads (you, or auto + spot checks).

---

## 13. Levels (the 2go idea)

Five **phases**, each with a fresh progress bar. Inside each phase are **ranks**, and every rank has three steps (I, II, III). 20 ranks, 60 steps.

| Phase | Ranks, lowest to highest |
|---|---|
| 1. Rookie | Novice, Amateur, Regular |
| 2. Ultimate | Chief, Prodigy, Senator, Sensei, Shifu, Doctore |
| 3. Legend | Hero, Champion, Paragon, **Legend** |
| 4. Immortal | Awakening, Immortal |
| 5. Sages and Gods | Sage, Great Sage, God, True God, Ancient God |

Changes: "Baby Immortal" is now **Awakening**; **Commoner removed**; "Pro" renamed **Prodigy** (clashes with the paid plan). Top-rank order is my proposal (no standard exists); alternative is Great Sage at the very top. **Needs the user's confirmation.**

**Pace targets** (dials, tuned from real data; point thresholds computed afterwards). Power user (daily) / casual: Amateur 1 day / 2 days; Chief 2 weeks / 1 month; Sensei 2 / 4 months; **Doctore 3 / 10 months**; Legend 8 months / 2 years; Immortal 1 / 3 years; Great Sage 1.5 / 4 years; Ancient God 2 / 5+ years.

**Let them see the summit:** rank gallery (all 20 ranks visible, locked), "Glimpse" (wear the next phase's badge and frame for 10 minutes, once per phase), a gold animated Ancient God look (badge, glowing name, frame, Hall of Fame wall), a public Hall of Fame (with consent), celebrations on each rank-up.

**Pay to climb:** a boost moves you up **one step**, **at most once per 24 hours** (so a new rank takes 3+ days). Price grows with rank, shown before paying, no randomness (not a loot box), 18+, clear refunds. Hall of Fame counts **earned** points only. Native app: digital items must use store billing (**verify**). If the user meant one whole rank a day, Doctore is buyable in about 6 days, which devalues ranks.

**Points:** daily streak, posts liked by different accounts, helpful comments, invites that become real sign-ups, confirmed reports. Server-side only, daily cap, diminishing returns; confirmed violations remove points.

**Pro:** 2x points up to Doctore, Ultimate Pass (start at Chief), Pro badge. Unlock ideas: create Rooms from Chief (slows spam), longer video from Sensei, nominate Room moderators at Legend, Hall of Fame from Immortal.

**Ranks on anonymous posts:** yes on posts that show the **auto name** (the rank belongs to that pseudonym), **no on no-name posts** (a rare rank is a fingerprint). Two separate ladders, real-account rank and Anonymous rank, never shown together or linked.

**Decisions needed:** order of top ranks; one step vs one rank per day; what a third strike does to rank; 2go's level names.

---

## 14. Admin on its own subdomain

Move the admin out of `apps/web/src/app/admin` into a **separate app** served at `admin.<yourdomain>`.

- Separate codebase (`apps/admin` in this monorepo, or its own repo) and separate deployment.
- Own sign-in (admin accounts, email + password + **2-factor**), no shared sessions with the public app.
- It talks to the database through a **server-only API** with a service role; **the service key never reaches the browser.**
- Roles: super admin, moderator (reports/strikes), analyst (read-only), ads manager. Every action goes to the **audit log**.
- Sections: Analytics (11), Moderation queue (10), Users (strikes/bans), Rooms, Market listings, **Ads** (orders, approvals, 3+1 switch, pricing tiers), **Feature flags** (turn Room posts / Market / video / ads on or off without a deploy), Announcements, Complaints/Feedback.
- Today's admin (existing `/admin`, 1,654 lines, gated by `ADMIN_EMAIL`) is a good starting list of features but should be rebuilt in the new app instead of lifted as-is.

---

## 15. Logo

You said the current anonymous mark is "Reddit's own" and want an original. Current mark: a face with two eyes on a rounded shape (used in the welcome screen, avatars and the anonymous feed).

Direction: **two dots and a circle** as the base mark, with a **clown mask** idea worked in creatively (mask half, a smile line, or a mask-shaped negative space around the two dots). Constraints: it must read at 16px, work in one colour, look different from Reddit's mascot and from the "Anonymous" / V-for-Vendetta mask, and not be scary. I will make 3 SVG concepts when you approve the direction. Needs a trademark search before launch **(verify)**.

**Decisions needed:** pick a concept; check no conflict with an existing brand.

---

## 16. User targets for month one (planning, not a forecast)

I cannot predict this; nobody can. These are planning numbers built from assumptions so you know what to prepare for. Replace them with your own once the first week of data arrives.

Assumptions: web only, launched at 1 to 3 campuses; one campus has about 20k to 40k students; a small group of seeders (campus reps, 20 to 50 people) share links; the NGL-style loop converts some visitors into link owners.

| Scenario | Unique visitors | Accounts | Weekly actives |
|---|---|---|---|
| Slow (no viral loop) | 3,000 to 8,000 | 500 to 1,500 | 150 to 500 |
| Good (one campus catches on) | 15,000 to 40,000 | 4,000 to 10,000 | 1,500 to 4,000 |
| Viral (links spread across campuses) | 100,000+ | 25,000+ | 10,000+ |

What actually decides the outcome is the **viral coefficient**: each person who owns a link brings in new visitors; each visitor converts at some rate. If one link owner brings 3 visitors and 1 in 3 of them makes their own link, growth is ~1.0 per cycle and it keeps feeding itself. That loop (shareable cards, link previews, no wall on the link page) matters more than any feature on this list.

Infrastructure sizing: the ranges above are small. A single Next.js deployment plus Supabase handles the "Good" case; plan caching, CDN for media and rate limits before aiming at "Viral".

---

## 17. Build order and what blocks it

Everything below is in the **order I recommend**, with what it blocks on. Scope is large; each phase is days to weeks, not hours. "Deploy today" is realistic only for Phase 0.

| Phase | What | Blocked by |
|---|---|---|
| **0** | Finish current UI against the real backend; 18+ copy; remove unused old files; production `npm run build`; basic report/block everywhere; EXIF strip; light legal pages (terms/privacy placeholders) | New Supabase project, env vars |
| **1** | Anonymous-first landing, Anonymous ID flow, 30-second onboarding, **share cards + OG images** (the growth loop) | Phase 0 |
| **2** | Moderation v1: sensitive tag + blur, text filter, rate limits, strikes, report queue, audit log, community rules published | Phase 0, vendor choice, legal review |
| **3** | Analytics event pipeline + admin dashboards | Phase 0 |
| **4** | Rooms (backend + UI), merged Room feed, "Watch" mode | Migrations |
| **5** | Admin as its own app on `admin.` + feature flags | Phase 3, Phase 2 |
| **6** | Ads model 1 + self-serve + payments + pop-ups + sponsored market listings | Phase 3, 5, payment provider, ad policy |
| **7** | Short video (15 s) with scanner | Phase 2 classifier |
| **8** | Levels, streaks, leaderboards | Phase 3 |
| **9** | TikTok login, Apple login, notifications, in-app Market chat | — |

Feature flags in Phase 5 are what let you "disable it until later" without removing code. If you want that sooner, I can add a tiny client flag file in Phase 0.

---

## 18. Risks and honest caveats

1. **No backend has been tested.** Every test so far used a mocked API in the browser. The old Supabase project is unreachable. Expect fixes once a real project is connected (RLS policies, storage rules, email delivery).
2. **Anonymous + images + video = child-safety and legal exposure.** This is the one area where launching early can end the project. Decide the scanner and legal approach before public uploads.
3. **"Device ban" on web is weak.** See 10.3.
4. **500 KB videos** are not realistic at good quality. See 6.
5. **Instagram login** is not available for normal users. See PROJECT_STATE.
6. **Reach promises to advertisers** must be measured, not guessed. See 12.3.
7. **Data protection:** location, device, optional gender/age, strike history and fingerprints are personal data. Needs consent, a privacy policy and a lawyer **(verify NDPA)**.
8. **Scope.** The list in this plan is several months of work for one person. The order in 17 is chosen so that every phase ends in something you can test and deploy.
9. Work is **uncommitted** in the working tree (by your rule). A disk problem would lose it; consider your own backup.

---

## 19. Sources

- WhatsApp Status video length: [Green API: status length to 90 seconds](https://green-api.com/en/blog/2025/whatsapp-increases-status-length-to-90-seconds/), [GeeksforGeeks: one-minute status videos](https://www.geeksforgeeks.org/whatsapp-users-can-soon-upload-upto-one-minute-long-video-in-status/), [Gizchina: 60 seconds](https://www.gizchina.com/news/whatsapp-extends-video-status-length-say-more-with-60-seconds) (secondary sources; confirm in the app)
- Google Play UGC policy: [Play Console Help: User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937) and [related policy article](https://support.google.com/googleplay/android-developer/answer/12923286); [TechCrunch on Truth Social](https://techcrunch.com/?p=2381608)
- Reach / impressions / engagement definitions: [Oklahoma State Extension: Facebook metrics](https://extension.okstate.edu/fact-sheets/facebook-metrics-exposed-a-deep-dive-into-facebook-metrics-and-what-they-mean-for-your-organization.html), [Tinuiti: Facebook Page Insights](https://tinuiti.com/blog/paid-social/facebook-page-insights/)
- Sharing files from the web: [web.dev: Share files](https://web.dev/articles/files/share-files), [web.dev: Web Share API](https://web.dev/web-share/)
- Earlier research (auth): [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys), [TikTok Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web), [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/), [ZeptoMail email API](https://www.zoho.com/zeptomail/help/api/email-sending.html)
