import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { isMediaPath } from "../validate.js";

const IGNORE_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

export async function collectFromArgs(
  inputs: string[],
  includeVideo: boolean,
): Promise<string[]> {
  const out: string[] = [];
  for (const input of inputs) {
    let s;
    try {
      s = await stat(input);
    } catch {
      continue;
    }
    if (s.isFile()) {
      out.push(input);
      continue;
    }
    if (s.isDirectory()) {
      const entries = await readdir(input);
      for (const name of entries) {
        if (name.startsWith(".") || IGNORE_NAMES.has(name)) continue;
        const full = join(input, name);
        try {
          const st = await stat(full);
          if (st.isFile() && isMediaPath(full, includeVideo)) {
            out.push(full);
          }
        } catch {
          // skip
        }
      }
    }
  }
  return out;
}

export function looksLikeJunk(path: string): boolean {
  const name = basename(path);
  if (IGNORE_NAMES.has(name)) return true;
  if (name.startsWith(".")) return true;
  if (name.endsWith(".tmp") || name.endsWith("~")) return true;
  if (extname(name) === "") return true;
  return false;
}
