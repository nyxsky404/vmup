"use client";

import { useInView } from "motion/react";
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
  const play = !triggerOnView || inView;
  const words = children.split(" ");

  return (
    <span className={className} ref={ref}>
      <span className="sr-only">{children}</span>
      {words.map((word, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: words have no stable id
        <span key={index} aria-hidden="true" style={{ display: "inline-block" }}>
          <span
            aria-hidden="true"
            className="per-word-crossfade-word"
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              animationDelay: `${delay + index * stagger}ms`,
              animationPlayState: play ? "running" : "paused",
            }}
          >
            {word}
          </span>
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
