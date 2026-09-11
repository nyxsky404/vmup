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
        'max-lg:h-(--fd-header-height) max-lg:border-b max-lg:ps-4 max-lg:pe-3 max-lg:backdrop-blur-sm max-lg:layout:[--fd-header-height:--spacing(14)]',
        'max-lg:data-[transparent=false]:bg-fd-background/80',
        'lg:col-[3/5] lg:h-0 lg:min-h-0 lg:overflow-visible',
        props.className,
      )}
    >
      {slots.navTitle && (
        <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold lg:hidden" />
      )}
      <div
        className={cn(
          'flex flex-1 items-center justify-end gap-1.5 max-lg:gap-2',
          'lg:pointer-events-auto lg:absolute lg:inset-e-0 lg:top-0 lg:h-14 lg:pe-4',
        )}
      >
        <NavThemeSwitch className="max-lg:min-h-11 max-lg:min-w-11" />
        {slots.searchTrigger && (
          <slots.searchTrigger.sm
            hideIfDisabled
            className="p-2 lg:hidden max-lg:min-h-11 max-lg:min-w-11"
          />
        )}
        {slots.sidebar && (
          <slots.sidebar.trigger
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'icon-sm',
                className: 'p-2 lg:hidden max-lg:min-h-11 max-lg:min-w-11',
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
