import { docsLlms, learnLlms, learnSource } from '@/lib/source';
import { learnHubMarkdown } from '@/lib/learn-pages';
import { learnArticleUrls } from '@/lib/learn';

export const revalidate = false;

export async function GET() {
  const docs = await docsLlms.full();
  const learnPages = await Promise.all(
    learnArticleUrls.map(async (url) => {
      const page = learnSource.getPage([url.replace('/learn/', '')]);
      if (!page) return '';
      return learnLlms.page(page);
    }),
  );
  const learn = [learnHubMarkdown(), ...learnPages.filter(Boolean)].join(
    '\n\n---\n\n',
  );

  return new Response(`${docs}\n\n${learn}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
