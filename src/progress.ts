import { Transform } from "node:stream";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export type Spinner = {
  update: (label: string) => void;
  stop: (finalLine?: string) => void;
};

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Pass-through that reports cumulative bytes as they flow (respects backpressure). */
export function countBytes(onBytes: (n: number) => void): Transform {
  let n = 0;
  return new Transform({
    transform(chunk, _enc, cb) {
      n += Buffer.byteLength(chunk);
      onBytes(n);
      cb(null, chunk);
    },
  });
}

/**
 * TTY spinner on stderr (same braille animation as `vmup check`).
 * Animates when stderr is a TTY even with --json (JSON stays on stdout).
 * Non-TTY: prints the label once unless quiet.
 */
export function startSpinner(label: string, quiet: boolean): Spinner {
  if (!process.stderr.isTTY) {
    if (!quiet) console.error(label);
    return {
      update: () => undefined,
      stop: (finalLine) => {
        if (finalLine && !quiet) console.error(finalLine);
      },
    };
  }

  let current = label;
  let i = 0;
  const started = Date.now();
  const write = () => {
    const sec = Math.floor((Date.now() - started) / 1000);
    process.stderr.write(
      `\r${FRAMES[i % FRAMES.length]} ${current}  ${sec}s\x1b[K`,
    );
    i += 1;
  };
  write();
  const id = setInterval(write, 80);
  let stopped = false;
  return {
    update: (next) => {
      current = next;
    },
    stop: (finalLine) => {
      if (stopped) return;
      stopped = true;
      clearInterval(id);
      process.stderr.write("\r\x1b[2K");
      if (finalLine) console.error(finalLine);
    },
  };
}

export async function withSpinner<T>(
  label: string,
  quiet: boolean,
  fn: () => Promise<T>,
): Promise<T> {
  const spin = startSpinner(label, quiet);
  try {
    const result = await fn();
    spin.stop();
    return result;
  } catch (err) {
    spin.stop();
    throw err;
  }
}
