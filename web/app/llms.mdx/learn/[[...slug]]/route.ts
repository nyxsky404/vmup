import { learnLlms, learnSource } from '@/lib/source';
import { getPageMarkdownUrl } from '@/lib/shared';
import { learnHubMarkdown } from '@/lib/learn-pages';
import { notFound } from 'next/navigation';

export const revalidate = false;

const markdownHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow',
};

function isLearnHubSlug(slug: string[] | undefined) {
  if (!slug || slug.length === 0) return true;
  return slug.length === 1 && slug[0] === 'content.md';
}

export async function GET(
  _req: Request,
  { params }: RouteContext<'/llms.mdx/learn/[[...slug]]'>,
) {
  const { slug } = await params;
  if (isLearnHubSlug(slug) || !slug) {
    return new Response(learnHubMarkdown(), { headers: markdownHeaders });
  }

  const page = learnSource.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new Response(await learnLlms.page(page), { headers: markdownHeaders });
}

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ['content.md'] },
    ...learnSource.getPages().map((page) => ({
      lang: page.locale,
      slug: getPageMarkdownUrl(page, 'learn').segments,
    })),
  ];
}
