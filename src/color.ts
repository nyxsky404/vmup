function enabled(stream: NodeJS.WriteStream = process.stdout): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.TERM === "dumb") return false;
  return stream.isTTY === true;
}

function wrap(code: string, s: string, stream?: NodeJS.WriteStream): string {
  if (!enabled(stream)) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}

export const color = {
  dim: (s: string) => wrap("2", s),
  green: (s: string) => wrap("32", s),
  cyan: (s: string) => wrap("36", s),
  yellow: (s: string) => wrap("33", s),
  red: (s: string) => wrap("31", s),
  bold: (s: string) => wrap("1", s),
};

export function colorEnabled(): boolean {
  return enabled(process.stdout);
}
