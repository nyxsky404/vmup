import type { MetadataRoute } from 'next';
import { learnSource, source } from '@/lib/source';
import {
  docsSourcePath,
  gitLastModified,
  homePageSourcePath,
  learnSourcePath,
} from '@/lib/last-modified';
import { absoluteUrl } from '@/lib/shared';

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    lastModified: docsSourcePath(page),
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 0.9 : 0.7,
  }));

  const learn = [
    {
      url: absoluteUrl('/learn'),
      lastModified: gitLastModified(
        'web/app/learn/page.tsx',
        'web/lib/learn.ts',
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    ...learnSource.getPages().map((page) => ({
      url: absoluteUrl(page.url),
      lastModified: learnSourcePath(page),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  return [
    {
      url: absoluteUrl('/'),
      lastModified: gitLastModified(homePageSourcePath),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...learn,
    ...docs,
  ];
}
