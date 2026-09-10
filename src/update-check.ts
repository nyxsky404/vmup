import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheDir, PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import { color } from "./color.js";

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;
const NOTICE_TIMEOUT_MS = 1500;

type Cache = {
  checkedAt: number;
  latest: string;
  notifiedAt?: number;
  notifiedVersion?: string;
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

function skipCheck(): boolean {
  if (process.env.VMUP_NO_UPDATE_CHECK === "1") return true;
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  return false;
}

function cacheFile(): string {
  return join(cacheDir(), "update-check.json");
}

async function readCache(): Promise<Cache | null> {
  try {
    return JSON.parse(await readFile(cacheFile(), "utf8")) as Cache;
  } catch {
    return null;
  }
}

async function writeCache(c: Cache): Promise<void> {
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

/** Resolves to a newer version string when the user should be told. */
export function beginUpdateCheck(): Promise<string | null> {
  if (skipCheck()) return Promise.resolve(null);

  return (async () => {
    const now = Date.now();
    let cache = await readCache();
    const stale = !cache || now - cache.checkedAt > CHECK_EVERY_MS;

    if (stale) {
      const latest = await fetchLatest();
      if (latest) {
        cache = {
          checkedAt: now,
          latest,
          notifiedAt: cache?.notifiedAt,
          notifiedVersion: cache?.notifiedVersion,
        };
        await writeCache(cache).catch(() => undefined);
      }
    }

    if (!cache || !isNewer(cache.latest, PACKAGE_VERSION)) return null;

    const already =
      cache.notifiedVersion === cache.latest &&
      cache.notifiedAt != null &&
      now - cache.notifiedAt < CHECK_EVERY_MS;
    if (already) return null;

    return cache.latest;
  })();
}

export async function printUpdateNotice(
  pending: Promise<string | null>,
  json: boolean,
): Promise<void> {
  if (json || skipCheck()) return;
  try {
    const latest = await Promise.race([
      pending,
      new Promise<null>((r) => setTimeout(() => r(null), NOTICE_TIMEOUT_MS)),
    ]);
    if (!latest) return;
    console.error(`\n${formatUpdateNotice(latest)}`);
    const cache = (await readCache()) ?? {
      checkedAt: Date.now(),
      latest,
    };
    cache.notifiedAt = Date.now();
    cache.notifiedVersion = latest;
    await writeCache(cache).catch(() => undefined);
  } catch {
    // never fail the command
  }
}
