import type { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/anonymous', '/terms', '/privacy', '/guidelines'], disallow: ['/api/', '/admin', '/me', '/settings', '/notifications', '/create', '/payments', '/marketplace/messages'] }],
    sitemap: `${site.replace(/\/$/, '')}/sitemap.xml`,
  };
}
