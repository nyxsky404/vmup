const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export type Spinner = {
  stop: (finalLine?: string) => void;
};

/** TTY spinner on stderr. Quiet when --json or non-TTY (prints the label once). */
export function startSpinner(label: string, quiet: boolean): Spinner {
  if (quiet || !process.stderr.isTTY) {
    console.error(label);
    return { stop: (finalLine) => {
      if (finalLine) console.error(finalLine);
    } };
  }

  let i = 0;
  const started = Date.now();
  const write = () => {
    const sec = Math.floor((Date.now() - started) / 1000);
    process.stderr.write(`\r${FRAMES[i % FRAMES.length]} ${label}  ${sec}s`);
    i += 1;
  };
  write();
  const id = setInterval(write, 80);
  let stopped = false;
  return {
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
