import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import { DocsA11y } from '@/components/docs-a11y';
import { JsonLd } from '@/components/json-ld';
import { ViewOptionsPopover } from '@/components/view-options-popover';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { docsSourcePath } from '@/lib/last-modified';
import { docsJsonLd } from '@/lib/schema';
import {
  appName,
  docsSeoTitle,
  getPageImageUrl,
  getPageMarkdownUrl,
  gitConfig,
} from '@/lib/shared';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  if (params.slug?.length === 1 && params.slug[0] === 'index') {
    redirect('/docs');
  }

  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const image = getPageImageUrl(page).url;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContentPopover={{
        trigger: { 'aria-label': 'On this page' },
      }}
    >
      <DocsA11y />
      <JsonLd
        data={docsJsonLd({
          url: page.url,
          data: page.data,
          lastModified: docsSourcePath(page),
          image,
        })}
      />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton
          markdownUrl={markdownUrl}
          className="max-lg:min-h-11 max-lg:px-3"
        />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/web/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams().filter((params) => {
    const slug = params.slug;
    return !(Array.isArray(slug) && slug.length === 1 && slug[0] === 'index');
  });
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params;
  if (params.slug?.length === 1 && params.slug[0] === 'index') {
    redirect('/docs');
  }

  const page = source.getPage(params.slug);
  if (!page) notFound();

  const title = docsSeoTitle(page.url, page.data.title);
  const description = page.data.description;
  const image = getPageImageUrl(page).url;

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
