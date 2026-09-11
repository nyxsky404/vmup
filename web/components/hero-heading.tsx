'use client';

import PerWordCrossfade from '@/components/smoothui/per-word-crossfade';

export function HeroHeading({ children }: { children: string }) {
  return (
    <h1 className="font-serif text-[clamp(2.5rem,1.1rem+6vw,3.75rem)] leading-[1.1] tracking-tight text-foreground max-lg:leading-[1.15] lg:text-6xl">
      <PerWordCrossfade>{children}</PerWordCrossfade>
    </h1>
  );
}
