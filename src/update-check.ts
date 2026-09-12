import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cacheDir, PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import { color } from "./color.js";

export const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;

export type UpdateCache = {
  checkedAt: number;
  latest: string;
  notifiedAt?: number;
  notifiedVersion?: string;
};

export type UpdateCheckIo = {
  now?: () => number;
  readCache?: () => Promise<UpdateCache | null>;
  writeCache?: (c: UpdateCache) => Promise<void>;
  spawnCheck?: () => void;
  env?: NodeJS.ProcessEnv;
  stdoutTTY?: boolean;
  stderrTTY?: boolean;
  currentVersion?: string;
};

export function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const lv = a[i] ?? 0;
    const cv = b[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export function skipUpdateCheck(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VMUP_NO_UPDATE_CHECK === "1") return true;
  if (env.CI === "true" || env.CI === "1") return true;
  return false;
}

export function isInteractiveTty(
  stdoutTTY = Boolean(process.stdout.isTTY),
  stderrTTY = Boolean(process.stderr.isTTY),
): boolean {
  return stdoutTTY && stderrTTY;
}

export function cacheIsStale(
  cache: UpdateCache | null,
  now: number,
  interval = CHECK_EVERY_MS,
): boolean {
  return !cache || now - cache.checkedAt > interval;
}

/** Version to print from cache, or null if the user should not be told this run. */
export function noticeFromCache(
  cache: UpdateCache | null,
  currentVersion: string,
  now: number,
  interval = CHECK_EVERY_MS,
): string | null {
  if (!cache?.latest || !isNewer(cache.latest, currentVersion)) return null;
  if (cache.notifiedAt != null && now - cache.notifiedAt < interval) return null;
  return cache.latest;
}

function cacheFile(): string {
  return join(cacheDir(), "update-check.json");
}

async function readCacheFile(): Promise<UpdateCache | null> {
  try {
    return JSON.parse(await readFile(cacheFile(), "utf8")) as UpdateCache;
  } catch {
    return null;
  }
}

async function writeCacheFile(c: UpdateCache): Promise<void> {
  await mkdir(cacheDir(), { recursive: true });
  await writeFile(cacheFile(), JSON.stringify(c) + "\n", "utf8");
}

async function fetchLatest(): Promise<string | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: string };
    return body.version ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function childScript(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "update-check-child.js");
}

function spawnBackgroundCheck(): void {
  try {
    const child = spawn(process.execPath, [childScript()], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // never fail the command
  }
}

export function detectPackageManager(
  argv1 = process.argv[1] ?? "",
  env: NodeJS.ProcessEnv = process.env,
): "npm" | "pnpm" | "yarn" | "bun" | "npx" {
  const blob = [
    argv1,
    env.npm_execpath,
    env.npm_config_user_agent,
    env.PNPM_HOME,
    env.BUN_INSTALL,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (blob.includes("_npx") || blob.includes("/npx/")) return "npx";
  if (blob.includes("bun")) return "bun";
  if (blob.includes("pnpm") || blob.includes(".pnpm")) return "pnpm";
  if (blob.includes("yarn")) return "yarn";
  return "npm";
}

export function updateCommand(
  pm: ReturnType<typeof detectPackageManager> = detectPackageManager(),
): string {
  switch (pm) {
    case "pnpm":
      return `pnpm add -g ${PACKAGE_NAME}`;
    case "yarn":
      return `yarn global add ${PACKAGE_NAME}`;
    case "bun":
      return `bun install -g ${PACKAGE_NAME}`;
    case "npx":
      return `npx ${PACKAGE_NAME}@latest`;
    default:
      return `npm i -g ${PACKAGE_NAME}`;
  }
}

export function formatUpdateNotice(latest: string, pm = detectPackageManager()): string {
  return [
    color.yellow(`vmup ${latest} is available`) +
      color.dim(` (you have ${PACKAGE_VERSION})`),
    color.dim("  Update:  ") + color.cyan(updateCommand(pm)),
  ].join("\n");
}

/** Reads cache (and maybe starts a background refresh). Never waits on npm. */
export function beginUpdateCheck(io: UpdateCheckIo = {}): Promise<string | null> {
  const env = io.env ?? process.env;
  if (skipUpdateCheck(env)) return Promise.resolve(null);
  if (
    !isInteractiveTty(
      io.stdoutTTY ?? Boolean(process.stdout.isTTY),
      io.stderrTTY ?? Boolean(process.stderr.isTTY),
    )
  ) {
    return Promise.resolve(null);
  }

  const now = io.now ?? Date.now;
  const read = io.readCache ?? readCacheFile;
  const write = io.writeCache ?? writeCacheFile;
  const spawnCheck = io.spawnCheck ?? spawnBackgroundCheck;
  const currentVersion = io.currentVersion ?? PACKAGE_VERSION;

  return (async () => {
    let cache = await read();
    const t = now();
    if (cacheIsStale(cache, t)) {
      const stamped: UpdateCache = {
        checkedAt: t,
        latest: cache?.latest ?? "",
        notifiedAt: cache?.notifiedAt,
        notifiedVersion: cache?.notifiedVersion,
      };
      await write(stamped).catch(() => undefined);
      spawnCheck();
      cache = stamped;
    }
    return noticeFromCache(cache, currentVersion, t);
  })();
}

export async function printUpdateNotice(
  pending: Promise<string | null>,
  json: boolean,
  io: UpdateCheckIo = {},
): Promise<void> {
  const env = io.env ?? process.env;
  if (json || skipUpdateCheck(env)) return;
  if (
    !isInteractiveTty(
      io.stdoutTTY ?? Boolean(process.stdout.isTTY),
      io.stderrTTY ?? Boolean(process.stderr.isTTY),
    )
  ) {
    return;
  }
  try {
    const latest = await pending;
    if (!latest) return;
    console.error(`\n${formatUpdateNotice(latest)}`);
    const read = io.readCache ?? readCacheFile;
    const write = io.writeCache ?? writeCacheFile;
    const t = (io.now ?? Date.now)();
    const prev = await read();
    await write({
      checkedAt: prev?.checkedAt ?? t,
      latest: prev?.latest || latest,
      notifiedAt: t,
      notifiedVersion: latest,
    }).catch(() => undefined);
  } catch {
    // never fail the command
  }
}

/** Detached child: fetch latest and persist. Does not print. */
export async function runUpdateCheckChild(): Promise<void> {
  const latest = await fetchLatest();
  if (!latest) return;
  const prev = await readCacheFile();
  await writeCacheFile({
    checkedAt: Date.now(),
    latest,
    notifiedAt: prev?.notifiedAt,
    notifiedVersion: prev?.notifiedVersion,
  });
}
