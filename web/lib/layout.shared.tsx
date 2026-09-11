import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/components/logo';
import { SiteHeader } from '@/components/site-header';

export function homeOptions(): HomeLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
    slots: {
      header: SiteHeader,
    },
    themeSwitch: {
      enabled: false,
    },
    searchToggle: {
      enabled: false,
    },
  };
}

export function docsOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo animate />,
    },
    themeSwitch: {
      enabled: false,
    },
  };
}
