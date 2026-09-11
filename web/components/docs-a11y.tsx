'use client';

import { useEffect } from 'react';

function hideTocProgressFromAt() {
  document
    .querySelectorAll<SVGElement>('[data-toc-popover-trigger] svg')
    .forEach((el) => {
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-valuenow');
      el.removeAttribute('aria-valuemin');
      el.removeAttribute('aria-valuemax');
      el.removeAttribute('role');
    });
}

function syncDrawerA11y() {
  const drawer = document.getElementById('nd-sidebar-mobile');
  const drawerOpen = drawer?.getAttribute('data-state') === 'open';

  if (drawer) {
    drawer.toggleAttribute('inert', !drawerOpen);
  }

  const headerTrigger = document.querySelector<HTMLElement>(
    '#nd-subnav [aria-controls="nd-sidebar-mobile"]',
  );
  if (!headerTrigger) return;

  if (drawerOpen) {
    headerTrigger.setAttribute('inert', '');
    headerTrigger.setAttribute('aria-hidden', 'true');
  } else {
    headerTrigger.removeAttribute('inert');
    headerTrigger.removeAttribute('aria-hidden');
  }
}

function run() {
  hideTocProgressFromAt();
  syncDrawerA11y();
}

export function DocsA11y() {
  useEffect(() => {
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-valuenow', 'role', 'data-state'],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
