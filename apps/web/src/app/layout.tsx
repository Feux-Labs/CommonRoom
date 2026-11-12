import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import '../styles/cr-design-system.css';
import '../styles/cr-app.css';
import '../styles/cr-anonymous.css';
import '../styles/cr-market-profile.css';
import '../styles/cr-auth.css';
import { CommonRoomIconSymbols } from '@/components/cr/Icon';
import { AppProviders } from '@/features/app/AppSession';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

// Self-hosted at build time: no request to Google when someone opens the app, so it can't block the first paint.
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-hanken' });

export const metadata: Metadata = {
  // Base for share-preview image links. Set NEXT_PUBLIC_SITE_URL to the real domain when deploying.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Common Room',
  description: 'Post to your campus, say things anonymously, and buy and sell with students near you.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#161616' }],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // Light or dark follows the phone unless the member chose in Settings (the script below applies that choice before first paint).
    <html className={hanken.variable} lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body>
        <CommonRoomIconSymbols />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
