import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { homeOptions } from '@/lib/layout.shared';
import { appDescription, appTitle, homeOgImage } from '@/lib/shared';

export const metadata: Metadata = {
  title: {
    absolute: appTitle,
  },
  description: appDescription,
  openGraph: {
    title: appTitle,
    description: appDescription,
    images: [homeOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
    images: [homeOgImage.url],
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...homeOptions()}>{children}</HomeLayout>;
}
