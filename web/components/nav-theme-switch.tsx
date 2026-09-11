'use client';

import {
  ThemeSwitch,
  type ThemeSwitchProps,
} from '@/components/unlumen-ui/theme-switch';

export function NavThemeSwitch({
  className,
  size = 'icon',
}: {
  className?: string;
  size?: ThemeSwitchProps['size'];
}) {
  return <ThemeSwitch className={className} size={size} />;
}
