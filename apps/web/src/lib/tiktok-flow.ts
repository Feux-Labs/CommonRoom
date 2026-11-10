export const TIKTOK_STATE_COOKIE = 'tt_state';

/** The public address of the app (the one TikTok sends people back to). */
export function siteOrigin(request: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}
