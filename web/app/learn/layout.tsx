import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { homeOptions } from '@/lib/layout.shared';
import { browserTitle } from '@/lib/shared';

export const metadata: Metadata = {
  title: browserTitle('Learn'),
};

export default function Layout({ children }: LayoutProps<'/learn'>) {
  return <HomeLayout {...homeOptions()}>{children}</HomeLayout>;
}
