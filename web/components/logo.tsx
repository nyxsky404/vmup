'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import {
  createDotm3x3Component,
  spiralInward3NormFromIndex,
  spiralInward3OrderValue,
} from '@/lib/dotmatrix-core';

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

const MarkLive = createDotm3x3Component(
  'VmupMarkLive',
  ({ isActive, index, reducedMotion, phase }) => {
    if (!isActive) {
      return { className: 'dmx-inactive' };
    }

    const order = spiralInward3OrderValue(index);
    const pathNorm = spiralInward3NormFromIndex(index);
    const style = { '--dmx-spiral-order': order } as CSSProperties;

    if (reducedMotion || phase === 'idle') {
      return {
        style: {
          ...style,
          opacity: 0.16 + pathNorm * 0.78,
        },
      };
    }

    return { className: 'dmx-spiral-snake', style };
  },
  1.2,
);

export function BrandMark({
  className,
  animate = false,
  title,
  size = 32,
  dotSize = 6,
  cellPadding = 7,
}: {
  className?: string;
  animate?: boolean;
  title?: string;
  size?: number;
  dotSize?: number;
  cellPadding?: number;
}) {
  if (animate) {
    return (
      <MarkLive
        size={size}
        dotSize={dotSize}
        cellPadding={cellPadding}
        speed={1.2}
        bloom
        ariaLabel={title || 'vmup'}
        className={cn('shrink-0', className)}
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
          <BrandMark animate size={18} dotSize={4} cellPadding={3} />
        </span>
      ) : (
        <BrandMark className="size-[1.125rem]" />
      )}
      <span className="font-serif text-[1.375rem] leading-none tracking-tight">
        vmup
      </span>
    </span>
  );
}
