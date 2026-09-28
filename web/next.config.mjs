import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' blob: data: https://auraplusplus.com",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  } https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  images: {
    qualities: [75, 90],
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
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
        source: '/learn/index',
        destination: '/learn',
        permanent: true,
      },
      {
        source: '/learn/index/',
        destination: '/learn',
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
