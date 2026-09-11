import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { homeOptions } from '@/lib/layout.shared';
import { appDescription, appTitle } from '@/lib/shared';

export const metadata: Metadata = {
  title: {
    absolute: appTitle,
  },
  description: appDescription,
  openGraph: {
    title: appTitle,
    description: appDescription,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...homeOptions()}>{children}</HomeLayout>;
}
