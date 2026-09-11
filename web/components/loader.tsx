'use client';

import {
  DotmSquare3,
  type DotmSquare3Props,
} from '@/components/ui/dotm-square-3';

export function Loader({
  size = 32,
  dotSize = 4,
  speed = 1.2,
  bloom = true,
  ...props
}: DotmSquare3Props) {
  return (
    <DotmSquare3
      size={size}
      dotSize={dotSize}
      speed={speed}
      bloom={bloom}
      {...props}
    />
  );
}
