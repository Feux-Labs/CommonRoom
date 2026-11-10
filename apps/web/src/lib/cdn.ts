/**
 * Cloudflare keeps copies of media on its edge for hours. After a file is deleted from storage, this asks Cloudflare to
 * forget those copies so deleted pictures stop loading from their old links.
 * Env: CLOUDFLARE_API_TOKEN (permission Zone > Cache Purge > Purge) and CLOUDFLARE_ZONE_ID. With either missing this
 * does nothing (and says so once). It never throws: a failed purge must not stop a delete.
 */
type Fetch = typeof fetch;

let warned = false;

export function isCdnPurgeConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID);
}

/** Returns how many addresses were sent to Cloudflare to be forgotten. */
export async function purgeUrls(urls: string[], fetchImpl: Fetch = fetch): Promise<number> {
  const unique = [...new Set(urls.filter((url) => /^https:\/\//.test(url)))];
  if (!unique.length) return 0;
  if (!isCdnPurgeConfigured()) {
    if (!warned) { warned = true; console.warn('CDN purge is not configured: deleted media can stay visible on the edge for up to its cache time.'); }
    return 0;
  }
  let purged = 0;
  // Cloudflare accepts up to 30 addresses per request.
  for (let index = 0; index < unique.length; index += 30) {
    const batch = unique.slice(index, index + 30);
    try {
      const response = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(process.env.CLOUDFLARE_ZONE_ID as string)}/purge_cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: batch }),
      });
      if (response.ok) purged += batch.length;
      else console.error('CDN purge was refused.', response.status);
    } catch (error) {
      console.error('CDN purge failed.', error instanceof Error ? error.message : 'unknown');
    }
  }
  return purged;
}
