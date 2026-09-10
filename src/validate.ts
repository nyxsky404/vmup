import { extname } from "node:path";
import { stat } from "node:fs/promises";
import { IMAGE_EXTS, VIDEO_EXTS } from "./constants.js";

export type ValidateOptions = {
  force?: boolean;
  includeVideo?: boolean;
  maxBytes?: number;
  maxFiles?: number;
};

const DEFAULT_MAX_BYTES = 200 * 1024 * 1024; // 200MB per file
const DEFAULT_MAX_FILES = 200;

export function isImagePath(p: string): boolean {
  return IMAGE_EXTS.has(extname(p).toLowerCase());
}

export function isVideoPath(p: string): boolean {
  return VIDEO_EXTS.has(extname(p).toLowerCase());
}

export function isMediaPath(p: string, includeVideo: boolean): boolean {
  if (isImagePath(p)) return true;
  if (includeVideo && isVideoPath(p)) return true;
  return false;
}

export type ValidateResult = {
  accepted: string[];
  skipped: { path: string; reason: string }[];
};

export async function validatePaths(
  paths: string[],
  opts: ValidateOptions = {},
): Promise<ValidateResult> {
  const includeVideo = opts.includeVideo ?? false;
  const force = opts.force ?? false;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const accepted: string[] = [];
  const skipped: { path: string; reason: string }[] = [];

  for (const p of paths) {
    if (accepted.length >= maxFiles) {
      skipped.push({ path: p, reason: `exceeds max files (${maxFiles})` });
      continue;
    }
    let s;
    try {
      s = await stat(p);
    } catch {
      skipped.push({ path: p, reason: "not found" });
      continue;
    }
    if (!s.isFile()) {
      skipped.push({ path: p, reason: "not a file" });
      continue;
    }
    if (s.size > maxBytes) {
      skipped.push({ path: p, reason: `too large (>${maxBytes} bytes)` });
      continue;
    }
    if (!isMediaPath(p, includeVideo)) {
      if (force) {
        accepted.push(p);
      } else {
        skipped.push({ path: p, reason: "not an allowed media type" });
      }
      continue;
    }
    accepted.push(p);
  }

  return { accepted, skipped };
}
