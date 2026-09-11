import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/components/logo';
import { NavThemeSwitch } from '@/components/nav-theme-switch';
import { GITHUB_URL, NPM_URL } from '@/lib/install';

export function homeOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      children: (
        <NavThemeSwitch className="max-lg:ms-auto lg:hidden min-h-11 min-w-11" />
      ),
    },
    githubUrl: GITHUB_URL,
    links: [
      {
        text: 'Docs',
        url: '/docs',
      },
      {
        text: 'Install',
        url: '/docs/install',
      },
      {
        text: 'npm',
        url: NPM_URL,
        external: true,
      },
    ],
    themeSwitch: {
      component: <NavThemeSwitch />,
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
