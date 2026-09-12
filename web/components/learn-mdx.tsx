import Link from 'fumadocs-core/link';
import type { HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';
import { MdxTable } from '@/components/mdx-table';

function Pre(props: HTMLAttributes<HTMLPreElement>) {
  return <pre {...props} />;
}

export function getLearnMdxComponents(): MDXComponents {
  return {
    a: Link,
    table: MdxTable,
    pre: Pre,
    h1: (props) => <h1 {...props} />,
    h2: (props) => <h2 {...props} />,
    h3: (props) => <h3 {...props} />,
    h4: (props) => <h4 {...props} />,
  };
}
