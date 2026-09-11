import { GITHUB_URL, NPM_URL, PACKAGE_NAME } from '@/lib/install';
import {
  absoluteUrl,
  appDescription,
  appName,
  softwareVersion,
} from '@/lib/shared';

type HowToStep = {
  '@type': 'HowToStep';
  position: number;
  name: string;
  text: string;
  url: string;
};

function howToSteps(
  pageUrl: string,
  steps: Array<{ name: string; text: string; hash?: string }>,
): HowToStep[] {
  return steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
    url: step.hash ? `${pageUrl}#${step.hash}` : pageUrl,
  }));
}

function installHowTo(pageUrl: string, description?: string) {
  return {
    '@type': 'HowTo',
    '@id': `${pageUrl}#howto`,
    name: 'Install vmup',
    description,
    step: howToSteps(pageUrl, [
      {
        name: 'Confirm Node 18+ and OpenSSH',
        text: 'Run node -v, ssh -V, and which scp. Node must print v18 or newer. ssh and scp must exist on your PATH.',
      },
      {
        name: 'Global install',
        text: 'Install the CLI with npm, pnpm, yarn, bun, or the curl script. Then run vmup --version.',
        hash: 'global-install',
      },
      {
        name: 'After install',
        text: 'Continue with First upload for vmup init and a file. Disable the update notice with VMUP_NO_UPDATE_CHECK=1 if you need to.',
        hash: 'after-install',
      },
    ]),
  };
}

function quickstartHowTo(pageUrl: string, description?: string) {
  return {
    '@type': 'HowTo',
    '@id': `${pageUrl}#howto`,
    name: 'First SSH upload for a coding agent',
    description,
    step: howToSteps(pageUrl, [
      {
        name: 'Install vmup',
        text: 'Follow Install until vmup --version prints a version.',
        hash: '1-install-vmup',
      },
      {
        name: 'Create config',
        text: 'Run vmup init and fill host, user, key, port, remote dir, and TTL. Config is written to ~/.config/vmup/config.toml.',
        hash: '2-create-config',
      },
      {
        name: 'Confirm SSH',
        text: 'Run vmup check. Success prints SSH OK and the remote dir. Fix connection failures in Fix SSH.',
        hash: '3-confirm-ssh',
      },
      {
        name: 'Upload one file',
        text: 'Run vmup ./shot.png (or another file). Stdout prints the remote folder path and a prompt to paste.',
        hash: '4-upload-one-file',
      },
      {
        name: 'Give the path to the agent',
        text: 'Paste the clipboard path into the agent thread. The printed prompt is Please inspect all files in …',
        hash: '5-give-the-path-to-the-agent',
      },
    ]),
  };
}

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
  lastModified?: Date;
  image?: string;
}) {
  const origin = absoluteUrl('/');
  const orgId = `${origin}#organization`;
  const pageUrl = absoluteUrl(page.url);
  const dateModified = page.lastModified?.toISOString();
  const image = page.image ? absoluteUrl(page.image) : undefined;
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

  const isExplain = page.url.startsWith('/docs/explain/');
  const webpage = {
    '@type': isExplain ? 'TechArticle' : 'WebPage',
    '@id': `${pageUrl}#webpage`,
    headline: isExplain ? page.data.title : undefined,
    name: page.data.title,
    description: page.data.description,
    url: pageUrl,
    image,
    dateModified,
    author: isExplain ? { '@id': orgId } : undefined,
    publisher: { '@id': orgId },
    isPartOf: { '@id': `${origin}#website` },
    mainEntity:
      page.url === '/docs/install' || page.url === '/docs/quickstart'
        ? { '@id': `${pageUrl}#howto` }
        : undefined,
  };

  const graph: object[] = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: appName,
      url: origin,
    },
    webpage,
    {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs,
    },
  ];

  if (page.url === '/docs/install') {
    graph.push(installHowTo(pageUrl, page.data.description));
  }
  if (page.url === '/docs/quickstart') {
    graph.push(quickstartHowTo(pageUrl, page.data.description));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
