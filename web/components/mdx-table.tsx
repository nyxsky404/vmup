'use client';

import { useLayoutEffect, useRef, type TableHTMLAttributes } from 'react';

export function MdxTable(props: TableHTMLAttributes<HTMLTableElement>) {
  const ref = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const table = ref.current;
    if (!table) return;
    const headers = [...table.querySelectorAll('thead th')].map(
      (th) => th.textContent?.trim() ?? '',
    );
    table.querySelectorAll('tbody tr').forEach((row) => {
      row.querySelectorAll('td').forEach((cell, index) => {
        if (headers[index]) cell.setAttribute('data-label', headers[index]);
      });
    });
  });

  return (
    <div className="vmup-table-scroll">
      <table ref={ref} {...props} />
    </div>
  );
}
