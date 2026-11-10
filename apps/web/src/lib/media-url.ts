/**
 * Public address of our Cloudflare R2 media bucket (R2_PUBLIC_URL, exposed to the browser through
 * next.config.ts). Only media that lives there is accepted: without this, a client could attach any
 * URL to a post, listing or avatar: tracking pixels that reveal viewers' IP addresses, or hotlinked
 * illegal content we would then appear to host.
 */
export function mediaBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
}

/** Public URL for a stored object path such as "<user-id>/<file>.jpg" or "anonymous/<file>.jpg". */
export function mediaUrlFor(path: string, base = mediaBaseUrl()): string {
  return base ? `${base}/${path.split('/').map(encodeURIComponent).join('/')}` : '';
}

export function isOwnStorageUrl(value: unknown, baseUrl = mediaBaseUrl()): boolean {
  if (typeof value !== 'string' || value.length > 2048 || !baseUrl) return false;
  try {
    const url = new URL(value);
    const base = new URL(baseUrl);
    const basePath = base.pathname.replace(/\/+$/, '');
    return url.protocol === 'https:'
      && url.host === base.host
      && url.pathname.startsWith(`${basePath}/`)
      && url.pathname.length > basePath.length + 1
      && !url.pathname.includes('..')
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}
