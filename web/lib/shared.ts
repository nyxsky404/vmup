import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'vmup';
export const appTagline = 'Upload files to your VM';
export const appTitle = `${appName} — ${appTagline}`;
export const appDescription =
  'vmup batches files over SSH and leaves one remote folder path on your clipboard, plus a prompt your coding agent can paste. Default TTL is 5 minutes.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

/** Document title that ignores the root "%s — vmup" template. */
export function absoluteTitle(title: string) {
  return { absolute: title };
}

/**
 * Page-tab title. Uses the root template unless the page name already
 * contains the product, which would read as "Script vmup — vmup".
 */
export function browserTitle(pageName: string) {
  if (new RegExp(`\\b${appName}\\b`, 'i').test(pageName)) {
    return absoluteTitle(pageName);
  }
  return pageName;
}

export function docsBrowserTitle(slug: string[] | undefined, pageName: string) {
  if (!slug?.length) return 'Docs';
  return browserTitle(pageName);
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL('http://localhost:3000');
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
