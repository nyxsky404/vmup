import { GITHUB_URL, NPM_URL, PACKAGE_NAME } from '@/lib/install';
import {
  absoluteUrl,
  appDescription,
  appName,
  softwareVersion,
} from '@/lib/shared';

export function homeJsonLd() {
  const origin = absoluteUrl('/');
  const orgId = `${origin}#organization`;
  const siteId = `${origin}#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: appName,
        url: origin,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/brand/app-icon-1024.png'),
          width: 1024,
          height: 1024,
        },
        sameAs: [GITHUB_URL, NPM_URL],
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        name: appName,
        url: origin,
        description: appDescription,
        publisher: { '@id': orgId },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}#app`,
        name: appName,
        alternateName: PACKAGE_NAME,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Linux, Windows via WSL',
        softwareVersion,
        license: 'https://opensource.org/licenses/MIT',
        url: origin,
        downloadUrl: NPM_URL,
        installUrl: NPM_URL,
        image: absoluteUrl('/brand/app-icon-1024.png'),
        description: appDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: { '@id': orgId },
        isPartOf: { '@id': siteId },
      },
    ],
  };
}

export function docsJsonLd(page: {
  url: string;
  data: { title: string; description?: string };
}) {
  const origin = absoluteUrl('/');
  const pageUrl = absoluteUrl(page.url);
  const crumbs: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: origin,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Documentation',
      item: absoluteUrl('/docs'),
    },
  ];

  if (page.url !== '/docs') {
    crumbs.push({
      '@type': 'ListItem',
      position: 3,
      name: page.data.title,
      item: pageUrl,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name: page.data.title,
        description: page.data.description,
        url: pageUrl,
        isPartOf: { '@id': `${origin}#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs,
      },
    ],
  };
}
