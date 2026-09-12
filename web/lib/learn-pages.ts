import {
  formatLearnHubMarkdown,
  learnArticleSlug,
  learnArticleUrls,
} from '@/lib/learn';
import { siteUrl } from '@/lib/shared';
import { learnSource } from '@/lib/source';

export function learnPostSummaries() {
  return learnArticleUrls.flatMap((url) => {
    const page = learnSource.getPage([learnArticleSlug(url)]);
    if (!page) return [];
    return [
      {
        url,
        title: page.data.title,
        description: page.data.description,
      },
    ];
  });
}

export function learnHubMarkdown() {
  return formatLearnHubMarkdown(siteUrl().origin, learnPostSummaries());
}
