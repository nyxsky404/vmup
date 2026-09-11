'use client';

import { useEffect } from 'react';

function hideTocProgressFromAt() {
  document
    .querySelectorAll<SVGElement>(
      '[data-toc-popover-trigger] svg[role="progressbar"]',
    )
    .forEach((el) => {
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-valuenow');
      el.removeAttribute('aria-valuemin');
      el.removeAttribute('aria-valuemax');
      el.removeAttribute('role');
    });
}

export function DocsA11y() {
  useEffect(() => {
    hideTocProgressFromAt();
    const observer = new MutationObserver(hideTocProgressFromAt);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-valuenow', 'role'],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
