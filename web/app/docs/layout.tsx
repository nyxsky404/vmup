import { DocsHeader } from '@/components/docs-header';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...docsOptions()}
      slots={{ header: DocsHeader }}
    >
      {children}
    </DocsLayout>
  );
}
