# Schoomate App

This repository contains two frontend apps:

- `apps/web`: Next.js web app with TypeScript, App Router, ESLint, and Tailwind CSS.
- `apps/mobile`: Expo React Native app with TypeScript.

## Install Dependencies

The initial scaffold could not install dependencies because the machine ran out of disk space during `npm install`.
After freeing space, install dependencies per app:

```bash
cd apps/web
npm install
```

```bash
cd apps/mobile
npm install
```

## Run Apps

From the repository root:

```bash
npm run web:dev
```

```bash
npm run mobile:start
```

## Verify

From the repository root:

```bash
npm run mobile:typecheck
npm run mobile:export:web
npm run web:build
```

If you are already inside `apps/mobile`, run mobile commands without `--prefix`:

```bash
npm run typecheck
npx expo export --platform web --clear
```

You can also run platform-specific mobile commands:

```bash
npm run mobile:android
npm run mobile:ios
npm run mobile:web
```

## Notes For Development

Keep web-only dependencies inside `apps/web` and mobile-only dependencies inside `apps/mobile`.
That separation prevents a package needed by one platform from accidentally breaking the other.
