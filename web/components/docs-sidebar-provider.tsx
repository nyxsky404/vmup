'use client';

import {
  SidebarProvider,
  type SidebarProviderProps,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';

const FUMA_DRAWER_QUERY = '(width < 768px)';
const TABLET_DRAWER_QUERY = '(width < 1024px)';

let patched = false;

function patchMatchMedia() {
  if (patched) return;
  patched = true;
  const original = window.matchMedia.bind(window);
  window.matchMedia = ((query: string) =>
    original(query === FUMA_DRAWER_QUERY ? TABLET_DRAWER_QUERY : query)) as typeof window.matchMedia;
}

if (typeof window !== 'undefined') {
  patchMatchMedia();
}

/** Fumadocs drawer vs sidebar is hardcoded at 768px. Treat tablets as a drawer too. */
export function DocsSidebarProvider(props: SidebarProviderProps) {
  return <SidebarProvider {...props} />;
}
