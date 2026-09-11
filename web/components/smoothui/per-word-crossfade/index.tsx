"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

export interface PerWordCrossfadeProps {
  children: string;
  className?: string;
  /** Delay before the animation starts, in milliseconds. */
  delay?: number;
  /** Per-word stagger, in milliseconds. */
  stagger?: number;
  /** Animate only once the text scrolls into view. */
  triggerOnView?: boolean;
}

const DURATION_S = 0.7;
const MS = 1000;
// Calm keynote ease-out.
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * PerWordCrossfade — per-word fade-in with a subtle upward drift,
 * calm keynote rhythm. From the animate-text catalog
 * (`per-word-crossfade`).
 */
export default function PerWordCrossfade({
  children,
  className = "",
  delay = 0,
  stagger = 70,
  triggerOnView = false,
}: PerWordCrossfadeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();
  const play = (!triggerOnView || inView) && !shouldReduceMotion;
  const words = children.split(" ");

  return (
    <span className={className} ref={ref}>
      <span className="sr-only">{children}</span>
      {words.map((word, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: words have no stable id
        <span key={index} aria-hidden="true" style={{ display: "inline-block" }}>
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            aria-hidden="true"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 8 }}
            style={{ display: "inline-block", whiteSpace: "pre" }}
            transition={
              !play
                ? { duration: 0 }
                : {
                    delay: delay / MS + (index * stagger) / MS,
                    duration: DURATION_S,
                    ease: EASE,
                  }
            }
          >
            {word}
          </motion.span>
          {index < words.length - 1 && (
            <span
              aria-hidden="true"
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {" "}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
