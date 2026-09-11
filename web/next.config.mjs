import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  async redirects() {
    return [
      {
        source: '/docs/index',
        destination: '/docs',
        permanent: true,
      },
      {
        source: '/docs/index/',
        destination: '/docs',
        permanent: true,
      },
      {
        source: '/security.txt',
        destination: '/.well-known/security.txt',
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
