import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/shared';

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl().origin;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/llms.mdx/', '/*.md$', '/docs/index', '/learn/index'],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
