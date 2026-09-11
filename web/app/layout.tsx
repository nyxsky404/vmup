import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/cn';
import { SkipLink } from '@/components/skip-link';
import { appDescription, appName, appTitle, siteUrl } from '@/lib/shared';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: appName,
  title: {
    default: appTitle,
    template: `%s — ${appName}`,
  },
  description: appDescription,
  appleWebApp: {
    title: appName,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: appName,
    title: appTitle,
    description: appDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        inter.variable,
        instrumentSerif.variable,
        GeistMono.variable,
        'font-sans',
      )}
    >
      <body className="flex min-h-screen flex-col max-lg:min-h-dvh">
        <SkipLink />
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            enableSystem: false,
            attribute: 'class',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
