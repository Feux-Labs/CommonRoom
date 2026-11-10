import type { MetadataRoute } from 'next';

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Only pages that are public and meant to be found. Everything personal stays out. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/anonymous', '/marketplace', '/terms', '/privacy', '/guidelines'].map((path) => ({
    url: `${site}${path}`,
    changeFrequency: path === '/anonymous' || path === '/marketplace' ? 'hourly' : 'monthly',
    priority: path === '/anonymous' ? 1 : 0.5,
  }));
}
