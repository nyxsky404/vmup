import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { homeOptions } from '@/lib/layout.shared';
import { browserTitle } from '@/lib/shared';

export const metadata: Metadata = {
  title: browserTitle('Page not found'),
  description: 'That URL is not a page on this site.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <HomeLayout {...homeOptions()}>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-24 pt-16 sm:pt-24">
        <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          That URL is not a page on this site.
        </p>
        <p className="mt-8 text-sm">
          <Link href="/" className="underline underline-offset-4">
            Home
          </Link>
          {' · '}
          <Link href="/docs" className="underline underline-offset-4">
            Docs
          </Link>
          {' · '}
          <Link href="/learn" className="underline underline-offset-4">
            Learn
          </Link>
        </p>
      </main>
    </HomeLayout>
  );
}
