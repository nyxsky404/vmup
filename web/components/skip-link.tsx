'use client';

import { usePathname } from 'next/navigation';

export function SkipLink() {
  const pathname = usePathname();
  const href = pathname.startsWith('/docs') ? '#nd-page' : '#main-content';

  return (
    <a className="skip-link" href={href}>
      Skip to content
    </a>
  );
}
