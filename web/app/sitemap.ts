import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { docsSourcePath, gitLastModified, homePageSourcePath } from '@/lib/last-modified';
import { absoluteUrl } from '@/lib/shared';

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    lastModified: docsSourcePath(page),
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 0.9 : 0.7,
  }));

  return [
    {
      url: absoluteUrl('/'),
      lastModified: gitLastModified(homePageSourcePath),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...docs,
  ];
}
