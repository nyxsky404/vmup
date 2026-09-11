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

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL('http://localhost:3000');
}

export function absoluteUrl(pathname = '/') {
  return new URL(pathname, siteUrl()).toString();
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
