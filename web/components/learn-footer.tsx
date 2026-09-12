import Link from 'next/link';
import { GITHUB_ISSUES_URL, GITHUB_URL, NPM_URL } from '@/lib/install';
import { cn } from '@/lib/cn';

const links = [
  { href: GITHUB_URL, label: 'GitHub', external: true },
  { href: NPM_URL, label: 'npm', external: true },
  { href: GITHUB_ISSUES_URL, label: 'Issues', external: true },
  { href: '/docs/contact', label: 'Security' },
  { href: '/docs/changelog', label: 'Changelog' },
];

const linkClass =
  'underline-offset-4 hover:text-foreground hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center';

export function LearnFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'mt-24 border-t border-border pt-8 text-sm text-muted-foreground max-lg:pb-[max(2rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <p>
        Maintained by{' '}
        <a href={GITHUB_URL} className={cn(linkClass, 'underline')}>
          nyxsky404
        </a>{' '}
        on GitHub. MIT
      </p>
      <nav
        aria-label="Project"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 max-lg:gap-y-0"
      >
        {links.map((item) =>
          item.external ? (
            <a key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </footer>
  );
}
