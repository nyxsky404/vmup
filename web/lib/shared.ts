import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'vmup';
export const appTitle =
  'vmup gives coding agents one folder path on the remote host';
export const appDescription =
  'vmup batches files over SSH and copies a prompt with the remote folder path to your clipboard. Default TTL is 5 minutes.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const softwareVersion = '0.4.0';

/** Document title that ignores the root "%s — vmup" template. */
export function absoluteTitle(title: string) {
  return { absolute: title };
}

function withProductSuffix(pageName: string) {
  if (new RegExp(`\\b${appName}\\b`, 'i').test(pageName)) {
    return pageName;
  }
  return `${pageName} — ${appName}`;
}

/**
 * Full tab title. Absolute so the initial HTML includes the product
 * suffix instead of waiting on streamed metadata.
 */
export function browserTitle(pageName: string) {
  return absoluteTitle(withProductSuffix(pageName));
}

export function docsBrowserTitle(_slug: string[] | undefined, pageName: string) {
  return browserTitle(pageName);
}

/** SERP title when the on-page H1 is too short to rank well. */
const docsSeoTitles: Record<string, string> = {
  '/docs': 'vmup documentation: install, first upload, and CLI reference',
  '/docs/install': 'Install vmup on macOS, Linux, or WSL',
  '/docs/quickstart': 'First SSH upload for a coding agent',
  '/docs/changelog': 'vmup changelog and release notes',
  '/docs/contact': 'Report vmup bugs and security issues',
  '/docs/guides/clipboard': 'Clipboard to SSH folder for a coding agent',
  '/docs/guides/watch': 'Watch a folder and upload new files over SSH',
  '/docs/guides/upload': 'Upload files, folders, or the picker over SSH',
  '/docs/guides/init': 'Run vmup init again or add a profile',
  '/docs/guides/profiles': 'Point vmup at another VM with profiles',
  '/docs/guides/ssh': 'Fix SSH failures before a vmup upload',
  '/docs/guides/scripting': 'Script vmup with env overlays and --json',
  '/docs/guides/cleanup': 'Wipe remote vmup batches with prune --all, or wait on TTL',
  '/docs/guides/restrict-types': 'Restrict vmup uploads to images or video',
  '/docs/guides/screenshots-to-agent':
    'Upload screenshots to a remote coding agent',
  '/docs/guides/clipboard-for-agents':
    'Clipboard to SSH for Claude Code or Cursor',
  '/docs/explain/how-it-works': 'How vmup builds an SSH batch',
  '/docs/explain/ttl': 'Why vmup batches expire after 5 minutes',
  '/docs/explain/ssh-modes': 'Direct SSH vs ssh_host in vmup',
  '/docs/reference/commands': 'vmup CLI commands: init, check, watch, prune',
  '/docs/reference/flags': 'vmup CLI flags for upload, watch, and prune',
  '/docs/reference/config': 'vmup config.toml keys, defaults, and profiles',
  '/docs/reference/exit-codes': 'vmup exit codes (0, 1, 2, 3, 4, 130)',
  '/docs/reference/json': 'vmup --json stdout schema for upload and check',
  '/docs/reference/env': 'vmup environment variables and overlays',
  '/docs/reference/errors': 'vmup error strings and what they mean',
  '/docs/reference/file-types': 'vmup file types, size limits, and names',
};

export function docsSeoTitle(pageUrl: string, pageName: string) {
  return docsBrowserTitle(undefined, docsSeoTitles[pageUrl] ?? pageName);
}

export const productionSiteOrigin = 'https://vmup.dev';

export const homeOgImage = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: appTitle,
};

function originUrl(value: string) {
  return new URL(`${new URL(value).origin}/`);
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return originUrl(explicit);
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return originUrl(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.NODE_ENV === 'development') {
    return originUrl('http://localhost:3000');
  }
  return originUrl(productionSiteOrigin);
}

export function absoluteUrl(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path === '/') {
    return `${siteUrl().origin}/`;
  }
  return new URL(path, siteUrl()).toString();
}

export const gitConfig = {
  user: 'nyxsky404',
  repo: 'vmup',
  branch: 'main',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
