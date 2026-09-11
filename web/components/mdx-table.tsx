import type { TableHTMLAttributes } from 'react';

export function MdxTable(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="vmup-table-scroll">
      <table {...props} />
    </div>
  );
}
