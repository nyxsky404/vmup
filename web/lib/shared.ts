import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'vmup';
export const appTitle =
  'vmup gives coding agents one folder path on the remote host';
export const appDescription =
  'vmup batches files over SSH and leaves one remote folder path on your clipboard, plus a prompt your coding agent can paste. Default TTL is 5 minutes.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const softwareVersion = '0.3.1';

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
  '/docs/reference/commands': 'vmup CLI commands: init, check, watch, prune',
  '/docs/reference/flags': 'vmup CLI flags for upload, watch, and prune',
  '/docs/reference/config': 'vmup config.toml keys, defaults, and profiles',
  '/docs/reference/exit-codes': 'vmup exit codes (0, 1, 2, 3, 4, 130)',
  '/docs/reference/json': 'vmup --json stdout schema for upload and check',
};

export function docsSeoTitle(pageUrl: string, pageName: string) {
  return docsBrowserTitle(undefined, docsSeoTitles[pageUrl] ?? pageName);
}

export const productionSiteOrigin = 'https://vmup.dev';

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
