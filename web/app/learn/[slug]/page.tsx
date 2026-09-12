import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/json-ld';
import { LearnFooter } from '@/components/learn-footer';
import { getLearnMdxComponents } from '@/components/learn-mdx';
import { learnJsonLd } from '@/lib/schema';
import {
  isLearnArticleUrl,
  learnArticleUrls,
  learnDateLabel,
  learnIsoDate,
  learnPostMeta,
  learnPublishedAt,
  learnRelated,
} from '@/lib/learn';
import { learnSourcePath } from '@/lib/last-modified';
import { learnSource } from '@/lib/source';
import {
  appName,
  getPageImageUrl,
  learnSeoTitle,
} from '@/lib/shared';

type Props = PageProps<'/learn/[slug]'>;

export const dynamicParams = false;

function pageForSlug(slug: string) {
  if (!learnArticleUrls.some((url) => url === `/learn/${slug}`)) {
    return undefined;
  }
  return learnSource.getPage([slug]);
}

export default async function LearnPostPage(props: Props) {
  const { slug } = await props.params;
  const page = pageForSlug(slug);
  if (!page || !isLearnArticleUrl(page.url)) notFound();

  const MDX = page.data.body;
  const image = getPageImageUrl(page, 'learn').url;
  const meta = learnPostMeta[page.url];
  const related = learnRelated(page.url).flatMap((url) => {
    const relatedPage = learnSource.getPage([url.replace('/learn/', '')]);
    if (!relatedPage) return [];
    return [{ url, title: relatedPage.data.title }];
  });

  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-24 pt-16 sm:pt-24"
      id="main-content"
      tabIndex={-1}
    >
      <JsonLd
        data={learnJsonLd({
          url: page.url,
          data: page.data,
          lastModified: learnSourcePath(page),
          image,
        })}
      />
      <p className="text-[12px] tracking-wide text-muted-foreground">
        {learnDateLabel(meta.date)}
        <span aria-hidden="true"> · </span>
        <span>#{meta.tag}</span>
      </p>
      <h1 className="mt-3 font-serif text-[clamp(1.85rem,1rem+3.2vw,2.75rem)] leading-[1.12] tracking-tight text-foreground">
        {page.data.title}
      </h1>
      {page.data.description ? (
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          {page.data.description}
        </p>
      ) : null}

      <article className="learn-article mt-10">
        <MDX components={getLearnMdxComponents()} />
      </article>

      <aside className="mt-16 rounded-xl border border-border bg-card px-5 py-5">
        <p className="font-medium text-foreground">Send a batch instead of pasting</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          vmup uploads the files over SSH and copies a prompt with the remote
          folder path.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
          <Link
            href="/docs/install"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            Install
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href="/docs/quickstart"
            className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
          >
            First upload
          </Link>
        </p>
      </aside>

      {related.length > 0 ? (
        <nav aria-label="More guides" className="mt-16">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            More guides
          </p>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={item.url}>
                <Link
                  href={item.url}
                  className="text-foreground underline-offset-4 hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p className="mt-12 text-sm text-muted-foreground">
        <Link
          href="/learn"
          className="underline underline-offset-4 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center"
        >
          All guides
        </Link>
      </p>
      <LearnFooter />
    </main>
  );
}

export function generateStaticParams() {
  return learnArticleUrls.map((url) => ({
    slug: url.replace('/learn/', ''),
  }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const page = pageForSlug(slug);
  if (!page) notFound();

  const title = learnSeoTitle(page.url, page.data.title);
  const description = page.data.description;
  const image = getPageImageUrl(page, 'learn').url;

  return {
    title,
    description,
    alternates: {
      canonical: page.url,
    },
    openGraph: {
      type: 'article',
      url: page.url,
      siteName: appName,
      title: title.absolute,
      description,
      publishedTime: isLearnArticleUrl(page.url)
        ? learnIsoDate(learnPostMeta[page.url].date)
        : learnPublishedAt,
      modifiedTime: learnSourcePath(page)?.toISOString(),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title.absolute,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title.absolute,
      description,
      images: [image],
    },
  };
}
