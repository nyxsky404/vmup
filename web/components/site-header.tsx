'use client';

import type { ComponentProps, ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'next/navigation';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Logo } from '@/components/logo';
import { NavThemeSwitch } from '@/components/nav-theme-switch';
import { cn } from '@/lib/cn';
import { GITHUB_URL, NPM_URL } from '@/lib/install';

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4h16v16H4V4zm2.5 2.5h11v11h-3V9.5h-2V17.5h-6v-11Z"
      />
    </svg>
  );
}

const iconLinkClass = buttonVariants({
  color: 'ghost',
  size: 'icon',
  className: cn(
    'text-fd-muted-foreground max-lg:min-h-11 max-lg:min-w-11',
    'data-[active=true]:text-fd-foreground',
    'motion-safe:transition-[color,background-color,scale] motion-safe:duration-150 motion-safe:ease-out',
    'motion-safe:active:scale-[0.96]',
  ),
});

function NavIconLink({
  href,
  label,
  external,
  active,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      external={external}
      aria-label={label}
      title={label}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      className={iconLinkClass}
    >
      {children}
    </Link>
  );
}

export function SiteHeader({ className, ...props }: ComponentProps<'header'>) {
  const pathname = usePathname();
  const docsActive = pathname === '/docs' || pathname.startsWith('/docs/');

  return (
    <header
      id="nd-nav"
      {...props}
      className={cn(
        'sticky top-0 z-40 border-b bg-fd-background/80 backdrop-blur-lg',
        className,
      )}
    >
      <nav
        aria-label="Site"
        className="mx-auto flex h-14 w-full max-w-(--fd-layout-width) items-center justify-between ps-4 pe-3 sm:px-4"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        >
          <Logo className="max-[22rem]:[&_[data-wordmark]]:sr-only" />
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/docs"
            aria-current={docsActive ? 'page' : undefined}
            className={cn(
              buttonVariants({ color: 'ghost', size: 'sm' }),
              'text-fd-muted-foreground max-lg:min-h-11 max-lg:px-3',
              'motion-safe:transition-[color,background-color,scale] motion-safe:duration-150 motion-safe:ease-out',
              'motion-safe:active:scale-[0.96]',
              docsActive && 'text-fd-foreground',
            )}
          >
            Docs
          </Link>
          <NavIconLink href={NPM_URL} label="npm" external>
            <NpmIcon />
          </NavIconLink>
          <NavIconLink href={GITHUB_URL} label="GitHub" external>
            <GitHubIcon />
          </NavIconLink>
          <NavThemeSwitch />
        </div>
      </nav>
    </header>
  );
}
