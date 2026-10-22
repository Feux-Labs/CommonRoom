This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Guest browsing and account setup

The web app starts a Supabase anonymous session for visitors so they can browse Room, Anonymous, Meet, Marketplace, and Games. Enable **Anonymous Sign-Ins** in the Supabase project's Auth settings and apply the project's SQL migrations, including `supabase/migrations/0002_anonymous_feed_inbox.sql`.

Apply `supabase/migrations/0015_public_read_only_browsing.sql` to enable read-only Room and Anonymous feeds and public Meet discovery when no account session is available. Public Room results include only non-age-restricted posts marked Public; public Meet results include only discoverable profiles whose owners confirmed age eligibility. Sign-in is still required for likes, comments, and other account actions.

Guests can set a Ghost ID and use Anonymous features. Identity-based actions such as Room posts, reactions, comments, follows, Marketplace changes, and Meet require a registered account. Creating an email account from the guest session or linking an OAuth identity keeps the same Supabase user ID, so that session's Ghost ID and inbox remain attached and can be accessed after signing in on another device. Signing into an existing account does not merge guest data; the app warns before that flow.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
