import { docsLlms } from '@/lib/source';
import { formatLearnLlmsIndex } from '@/lib/learn';
import { learnPostSummaries } from '@/lib/learn-pages';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

export async function GET() {
  const origin = siteUrl().origin;
  const docs = await docsLlms.index();
  const learn = formatLearnLlmsIndex(origin, learnPostSummaries());
  const optional = `## Optional

- [Full docs and Learn guides as markdown](${origin}/llms-full.txt)`;

  return new Response(`${docs}\n\n${learn}\n\n${optional}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
