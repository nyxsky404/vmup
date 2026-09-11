'use client';

import { cn } from '@/lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useDocsLayout } from 'fumadocs-ui/layouts/docs';
import { SidebarIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { NavThemeSwitch } from '@/components/nav-theme-switch';

export function DocsHeader(props: ComponentProps<'header'>) {
  const {
    isNavTransparent,
    slots,
    props: { nav },
  } = useDocsLayout();

  if (nav?.component) return nav.component;

  return (
    <header
      id="nd-subnav"
      data-transparent={isNavTransparent}
      {...props}
      className={cn(
        '[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex items-center',
        'max-md:h-(--fd-header-height) max-md:border-b max-md:ps-4 max-md:pe-3 max-md:backdrop-blur-sm max-md:layout:[--fd-header-height:--spacing(14)]',
        'max-md:data-[transparent=false]:bg-fd-background/80',
        'md:col-[3/5] md:h-0 md:min-h-0 md:overflow-visible',
        props.className,
      )}
    >
      {slots.navTitle && (
        <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold md:hidden" />
      )}
      <div
        className={cn(
          'flex flex-1 items-center justify-end gap-2',
          'md:pointer-events-auto md:absolute md:inset-e-0 md:top-0 md:h-14 md:pe-4',
        )}
      >
        <NavThemeSwitch className="min-h-11 min-w-11" />
        {slots.searchTrigger && (
          <slots.searchTrigger.sm
            hideIfDisabled
            className="min-h-11 min-w-11 p-2 md:hidden"
          />
        )}
        {slots.sidebar && (
          <slots.sidebar.trigger
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'icon-sm',
                className: 'min-h-11 min-w-11 p-2 md:hidden',
              }),
            )}
          >
            <SidebarIcon />
          </slots.sidebar.trigger>
        )}
      </div>
    </header>
  );
}
