'use client';

import PerWordCrossfade from '@/components/smoothui/per-word-crossfade';

export function HeroHeading({ children }: { children: string }) {
  return (
    <h1 className="font-serif text-[2.5rem] leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
      <PerWordCrossfade>{children}</PerWordCrossfade>
    </h1>
  );
}
