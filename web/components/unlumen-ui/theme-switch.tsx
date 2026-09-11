"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { cn } from "@/lib/utils";

// no-op fallback for browsers that don't support startViewTransition
function applyWithTransition(
  origin: { x: number; y: number },
  apply: () => void,
) {
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth < 1024
  ) {
    apply();
    return;
  }
  const { x, y } = origin;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  document.documentElement.style.setProperty("--vt-x", `${x}px`);
  document.documentElement.style.setProperty("--vt-y", `${y}px`);
  document.documentElement.style.setProperty("--vt-r", `${endRadius}px`);
  document.startViewTransition(apply).ready.catch(() => {});
}

const iconMotion = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  transition: { type: "spring" as const, duration: 0.3, bounce: 0 },
};

interface ThemeSwitchProps {
  /** Match Fumadocs icon buttons. Home GitHub uses `icon`; docs collapse uses `icon-sm`. */
  size?: "icon" | "icon-sm";
  className?: string;
}

function ThemeSwitch({ size = "icon", className }: ThemeSwitchProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const originRef = useRef({ x: 0, y: 0 });

  useEffect(() => setMounted(true), []);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    originRef.current = { x: e.clientX, y: e.clientY };
    const next = resolvedTheme === "dark" ? "light" : "dark";
    applyWithTransition(originRef.current, () => setTheme(next));
  };

  const isDark = resolvedTheme === "dark";
  const chrome = buttonVariants({
    color: "ghost",
    size,
    className: "relative min-h-11 min-w-11 cursor-pointer text-fd-muted-foreground",
  });

  if (!mounted) {
    return <div aria-hidden className={cn(chrome, className)} />;
  }

  return (
    <motion.button
      onClick={toggle}
      className={cn(chrome, className)}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", duration: 0.2, bounce: 0 }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            {...iconMotion}
            className="flex items-center justify-center"
          >
            <Moon />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            {...iconMotion}
            className="flex items-center justify-center"
          >
            <Sun />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export { ThemeSwitch, type ThemeSwitchProps };
