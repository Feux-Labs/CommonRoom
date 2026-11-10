# Deploying Common Room (Vercel + Supabase + Cloudflare R2)

Names only here. Never paste secret values into chat, tickets or git.

## 0. Already done (verified)
- Database: Supabase project with migrations 0001-0033 applied, row security on every table.
- Email codes: Supabase custom SMTP (ZeptoMail) + the 3 designed templates (`supabase/email-templates/`). Confirm email ON. OTP length 6.
- Anonymous sign-ins ON. Google provider ON.
- Media: R2 bucket with a custom domain + CORS rule (PUT).

## 1. Put the code on GitHub
You do this (the assistant never commits or pushes). The repo root is `Schoomateapp/`; the app is in `apps/web`.

## 2. Create the Vercel project
1. vercel.com > Add New > Project > import the repo.
2. **Root Directory: `apps/web`**. Framework: Next.js (auto). Build/install commands: leave default (`postinstall` runs `prisma generate`).
3. Environment Variables (Production). Copy each from your local `.env` files:

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `DATABASE_URL` | Supabase pooled connection string (used by admin/payments/scanning) |
| `DIRECT_URL` | Supabase direct connection string |
| `ADMIN_EMAIL` | the one email allowed into `/admin` |
| `NEXT_PUBLIC_SITE_URL` | `https://commonroom.feuxlabs.com.ng` (your live address, no trailing slash) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | support address shown on legal pages |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google web client ID |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 API token |
| `R2_BUCKET_NAME` (or `R2_BUCKET`) | bucket name |
| `R2_PUBLIC_BASE_URL` (or `R2_PUBLIC_URL`) | public media domain, e.g. `https://media.yourdomain.com` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (payments) |
| `GEMINI_API_KEY` | Google AI Studio key (content checks). Optional `GEMINI_MODEL` |
| `CRON_SECRET` | any long random string; Vercel sends it to cron routes |
| `NEXT_PUBLIC_AUTH_APPLE_ENABLED` | `true` only after Apple is set up in Supabase |

Switch-on variables (the features stay off until set):

| Name | Switches on |
|---|---|
| `ZEPTOMAIL_TOKEN`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, optional `ZEPTOMAIL_API_URL` | the "you're back" email (same Send Mail token as the Supabase SMTP password) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | captcha on guest sign-ins (secret key goes in Supabase > Authentication > Attack Protection) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | clearing deleted media from Cloudflare's cache |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `NEXT_PUBLIC_AUTH_TIKTOK_ENABLED=true` | "Continue with TikTok" (redirect URI to register: `https://<live address>/api/auth/tiktok/callback`) |

Optional: `PRICE_PRO_MONTH_NGN`, `PRICE_ULTIMATE_PASS_NGN`, `GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON` (only if not using Gemini), `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

`NEXT_PUBLIC_*` values and the R2 public URL are baked in at build time: change them, then redeploy.

4. Deploy.

## 3. Domain
Vercel > Project > Settings > Domains > add `commonroom.feuxlabs.com.ng`. Add the DNS record Vercel shows (a CNAME for `commonroom` to Vercel). Wait for it to say Valid.

## 4. After the first deploy: tell every service the live address
- **Supabase** > Authentication > URL Configuration: Site URL = your live address. Redirect URLs: the live address (and `http://localhost:3000` for development).
- **Google Cloud** > Credentials > your web client > Authorized JavaScript origins: add the live address.
- **R2 bucket** > Settings > CORS Policy: add the live address to `AllowedOrigins` (keep `AllowedMethods: ["PUT"]`, headers `Content-Type`, `Content-Length`).
- **Paystack** > Settings > API Keys & Webhooks: Webhook URL = `https://<live address>/api/paystack/webhook`.
- **Apple** (if used): Services ID return URL stays the Supabase callback URL; nothing else.

## 5. Smoke test the live site (5 minutes)
1. Open `/api/health` -> `{"ok":true}`.
2. Open `/anonymous` signed out: feed loads.
3. Sign up with a real email: the 6-digit code email arrives (check spam the first time), enter it.
4. Post an anonymous text post, then one with a photo (checks R2 + CORS). Delete it.
5. Open `/terms`, `/privacy`, `/guidelines`.
6. Sign in with Google (and Apple if enabled).
7. Market: list an item, open it, "Message seller" from another account.
8. Report a post, then open `/admin/moderation` as the admin account: the report is there.
9. Paystack: nothing is sold yet. Skip until a product screen ships.

## 6. Switching the security policy on
Headers are sent as `Content-Security-Policy-Report-Only`. After a day of real use with a quiet browser console (no "[Report Only] Refused to..." lines), change the header name in `apps/web/next.config.ts` to `Content-Security-Policy`.

## 7. Calendar reminders
- Apple client secret: expires every ~6 months (`node apps/web/scripts/apple-client-secret.cjs ...`).
- Supabase free tier pauses after about a week without traffic: upgrade, or keep it used.
- Gemini free tier has request limits; if content checks start failing with rate errors, enable billing on the key.
- Raise the Supabase email rate limit (Authentication > Rate Limits) above 30/hour before launch.

## Not built yet (post-launch)
Communities, People You May Know, analytics, levels, Pro, ads, the admin console with feature flags, a shorter onboarding, and scanning of comments/chat messages.
