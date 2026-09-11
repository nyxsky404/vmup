import { homedir, platform as osPlatform } from "node:os";
import { join } from "node:path";

export const APP_NAME = "vmup";
export const PACKAGE_NAME = "@nyxsky404/vmup";
export const PACKAGE_VERSION = "0.3.2";
export const BATCH_PREFIX = "agents";
export const DEFAULT_REMOTE_DIR = "~/vmup";
export const DEFAULT_TTL_MINUTES = 5;
/** @deprecated use DEFAULT_TTL_MINUTES; kept for reading old configs */
export const DEFAULT_TTL_HOURS = 5;
export const DEFAULT_PORT = 22;
export const DEFAULT_USER = "ubuntu";
export const DEFAULT_PROMPT =
  "Please inspect all files in {{remote_path}}";
export const LEGACY_IMAGES_PROMPT =
  "Please inspect all images in {{remote_path}}";
export const DEFAULT_PROFILE = "default";
export const DEFAULT_MAX_FILE_MB = 200;
export const DEFAULT_MAX_FILES = 200;
export const DEFAULT_ACCEPT_ALL_FILES = true;
export const DEFAULT_CLIP_DEDUP = true;

export const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
]);

export const VIDEO_EXTS = new Set([
  ".mov",
  ".mp4",
  ".m4v",
  ".webm",
  ".mkv",
  ".avi",
]);

export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

export function configDir(): string {
  if (process.env.VMUP_CONFIG_DIR) return expandHome(process.env.VMUP_CONFIG_DIR);
  if (process.env.XDG_CONFIG_HOME) {
    return join(process.env.XDG_CONFIG_HOME, APP_NAME);
  }
  return join(homedir(), ".config", APP_NAME);
}

export function configPath(): string {
  return join(configDir(), "config.toml");
}

export function cacheDir(): string {
  if (process.env.VMUP_CACHE_DIR) return expandHome(process.env.VMUP_CACHE_DIR);
  if (process.env.XDG_CACHE_HOME) {
    return join(process.env.XDG_CACHE_HOME, APP_NAME);
  }
  return join(homedir(), ".cache", APP_NAME);
}

export function defaultWatchDir(): string {
  const desktop = join(homedir(), "Desktop");
  const picturesShots = join(homedir(), "Pictures", "Screenshots");
  if (osPlatform() === "darwin") return desktop;
  // Linux / WSL: prefer Pictures/Screenshots when it exists at runtime;
  // constant default string for config templates.
  return picturesShots;
}

export function defaultSshKeyHint(): string {
  const ed = join(homedir(), ".ssh", "id_ed25519");
  const rsa = join(homedir(), ".ssh", "id_rsa");
  return ed;
}

export type ExitCode = 0 | 1 | 2 | 3 | 4 | 130;

export const EXIT = {
  OK: 0 as const,
  USAGE: 1 as const,
  EMPTY: 2 as const,
  SSH: 3 as const,
  UPLOAD: 4 as const,
  CANCEL: 130 as const,
};
