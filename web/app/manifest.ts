import type { MetadataRoute } from 'next';
import { appDescription, appName, appTitle } from '@/lib/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appTitle,
    short_name: appName,
    description: appDescription,
    start_url: '/',
    display: 'browser',
    background_color: '#121212',
    theme_color: '#121212',
    icons: [
      {
        src: '/favicon.ico',
        type: 'image/x-icon',
        sizes: '48x48',
      },
      {
        src: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
      {
        src: '/apple-icon.png',
        type: 'image/png',
        sizes: '180x180',
      },
    ],
  };
}
