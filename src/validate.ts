import { extname } from "node:path";
import { stat } from "node:fs/promises";
import {
  IMAGE_EXTS,
  VIDEO_EXTS,
  DEFAULT_MAX_FILE_MB,
  DEFAULT_MAX_FILES,
} from "./constants.js";

export type FileKind = "image" | "video" | "file";

export type ValidateOptions = {
  force?: boolean;
  includeVideo?: boolean;
  acceptAll?: boolean;
  maxBytes?: number;
  maxFiles?: number;
};

export function isImagePath(p: string): boolean {
  return IMAGE_EXTS.has(extname(p).toLowerCase());
}

export function isVideoPath(p: string): boolean {
  return VIDEO_EXTS.has(extname(p).toLowerCase());
}

export function fileKind(p: string): FileKind {
  if (isImagePath(p)) return "image";
  if (isVideoPath(p)) return "video";
  return "file";
}

export function isAllowedPath(
  p: string,
  opts: { includeVideo?: boolean; acceptAll?: boolean },
): boolean {
  if (opts.acceptAll) return true;
  if (isImagePath(p)) return true;
  if (opts.includeVideo && isVideoPath(p)) return true;
  return false;
}

/** @deprecated use isAllowedPath */
export function isMediaPath(p: string, includeVideo: boolean): boolean {
  return isAllowedPath(p, { includeVideo, acceptAll: false });
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
  const acceptAll = opts.acceptAll ?? true;
  const force = opts.force ?? false;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_FILE_MB * 1024 * 1024;
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
      const mb = Math.round(maxBytes / (1024 * 1024));
      skipped.push({ path: p, reason: `too large (>${mb} MB)` });
      continue;
    }
    if (!isAllowedPath(p, { includeVideo, acceptAll })) {
      if (force) {
        accepted.push(p);
      } else {
        skipped.push({ path: p, reason: "not an allowed type (images-only mode)" });
      }
      continue;
    }
    accepted.push(p);
  }

  return { accepted, skipped };
}
