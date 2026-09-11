import type { Metadata } from 'next';
import { DocsHeader } from '@/components/docs-header';
import { DocsSidebarProvider } from '@/components/docs-sidebar-provider';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  Sidebar,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { docsOptions } from '@/lib/layout.shared';
import { browserTitle } from '@/lib/shared';

export const metadata: Metadata = {
  title: browserTitle('Docs'),
};

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...docsOptions()}
      slots={{
        header: DocsHeader,
        sidebar: {
          provider: DocsSidebarProvider,
          root: Sidebar,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
