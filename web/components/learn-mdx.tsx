import Link from 'fumadocs-core/link';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';
import { MdxTable } from '@/components/mdx-table';
import { WorkflowDiagram } from '@/components/workflow-diagram';

function Pre(props: HTMLAttributes<HTMLPreElement>) {
  return <pre {...props} />;
}

function LearnProofImage({
  src,
  alt,
  openLabel,
}: {
  src: string;
  alt: string;
  openLabel: string;
}) {
  return (
    <a className="learn-proof-link" href={src} aria-label={openLabel}>
      <Image
        src={src}
        width={1200}
        height={675}
        sizes="(max-width: 767px) calc(100vw - 3rem), 720px"
        quality={90}
        alt={alt}
        preload
      />
    </a>
  );
}

export function getLearnMdxComponents(): MDXComponents {
  return {
    LearnProofImage,
    WorkflowDiagram,
    a: Link,
    table: MdxTable,
    pre: Pre,
    h1: (props) => <h1 {...props} />,
    h2: (props) => <h2 {...props} />,
    h3: (props) => <h3 {...props} />,
    h4: (props) => <h4 {...props} />,
  };
}
