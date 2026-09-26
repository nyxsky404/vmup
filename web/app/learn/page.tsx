import Link from 'next/link';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';
import { LearnFooter } from '@/components/learn-footer';
import { learnJsonLd } from '@/lib/schema';
import {
  learnArticleUrls,
  learnDateLabel,
  learnHub,
  learnPostMeta,
} from '@/lib/learn';
import { learnSource } from '@/lib/source';
import {
  appName,
  homeOgImage,
  learnSeoTitle,
} from '@/lib/shared';

const title = learnSeoTitle('/learn', learnHub.title);

export const metadata: Metadata = {
  title,
  description: learnHub.description,
  alternates: {
    canonical: '/learn',
    types: {
      'text/plain': '/llms.txt',
    },
  },
  openGraph: {
    type: 'website',
    url: '/learn',
    siteName: appName,
    title: title.absolute,
    description: learnHub.description,
    images: [homeOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: title.absolute,
    description: learnHub.description,
    images: [homeOgImage.url],
  },
};

export default function LearnIndexPage() {
  const posts = learnArticleUrls.flatMap((url) => {
    const slug = url.replace('/learn/', '');
    const page = learnSource.getPage([slug]);
    if (!page) return [];
    const meta = learnPostMeta[url];
    return [
      {
        url,
        title: page.data.title,
        description: page.data.description,
        date: meta.date,
        tags: meta.tags,
      },
    ];
  });

  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-24 pt-16 sm:pt-24"
      id="main-content"
      tabIndex={-1}
    >
      <JsonLd
        data={learnJsonLd({
          url: '/learn',
          data: { title: learnHub.title, description: learnHub.description },
          image: homeOgImage.url,
        })}
      />
      <p className="mb-3 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Learn
      </p>
      <h1 className="font-serif text-[clamp(2rem,1.1rem+4vw,3rem)] leading-[1.12] tracking-tight text-foreground">
        {learnHub.title}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        {learnHub.description}
      </p>

      <ul className="mt-14 divide-y divide-border border-t border-border">
        {posts.map((post) => (
          <li key={post.url} className="py-8">
            <p className="text-[11px] tracking-wide text-muted-foreground">
              {learnDateLabel(post.date)}
              {post.tags.map((tag) => (
                <span key={tag}>
                  <span aria-hidden="true"> · </span>#{tag}
                </span>
              ))}
            </p>
            <h2 className="mt-2 text-lg font-medium tracking-tight text-foreground">
              <Link
                href={post.url}
                className="hover:underline hover:underline-offset-4"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {post.description}
            </p>
          </li>
        ))}
      </ul>

      <LearnFooter />
    </main>
  );
}
