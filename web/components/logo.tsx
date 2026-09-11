'use client';

import { DotmSquare3 } from '@/components/ui/dotm-square-3';
import { cn } from '@/lib/cn';

const DOTS = [
  [14, 14],
  [32, 14],
  [50, 14],
  [14, 32],
  [32, 32],
  [50, 32],
  [14, 50],
  [32, 50],
  [50, 50],
] as const;

export function BrandMark({
  className,
  animate = false,
  title,
  size = 32,
  dotSize = 4,
}: {
  className?: string;
  animate?: boolean;
  title?: string;
  size?: number;
  dotSize?: number;
}) {
  if (animate) {
    return (
      <DotmSquare3
        size={size}
        dotSize={dotSize}
        speed={1.2}
        bloom
        opacityBase={0.22}
        opacityMid={0.4}
        opacityPeak={1}
        ariaLabel={title || 'vmup'}
        className={cn('vmup-mark shrink-0', className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={5} />
      ))}
    </svg>
  );
}

export function Logo({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-normal', className)}>
      {animate ? (
        <span aria-hidden="true" className="inline-flex">
          <BrandMark animate size={20} dotSize={3} />
        </span>
      ) : (
        <BrandMark className="size-[1.125rem]" />
      )}
      <span
        data-wordmark
        className="font-serif text-[1.375rem] leading-none tracking-tight"
      >
        vmup
      </span>
    </span>
  );
}
