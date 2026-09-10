import { watch as chokidarWatch } from "chokidar";
import { createInterface } from "node:readline";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { expandHome } from "../constants.js";
import type { StagingSession } from "../stage.js";
import { stageFile } from "../stage.js";
import { isMediaPath } from "../validate.js";
import { looksLikeJunk } from "./args.js";

export type WatchOptions = {
  dir: string;
  includeVideo: boolean;
  onCaptured?: (name: string) => void;
  /** Called when user requests stop-and-upload (Enter / stop). Ctrl+C should reject/cancel externally. */
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitUntilStable(path: string, tries = 10): Promise<boolean> {
  let last = -1;
  for (let i = 0; i < tries; i++) {
    try {
      const s = await stat(path);
      if (!s.isFile()) return false;
      if (s.size > 0 && s.size === last) return true;
      last = s.size;
    } catch {
      return false;
    }
    await sleep(350);
  }
  return last > 0;
}

/**
 * Foreground folder watcher. Ignores files that existed at start.
 * Stop with Enter, "stop", or Ctrl+D → upload.
 * Ctrl+C → cancel (caller handles).
 */
export async function collectFromWatch(
  session: StagingSession,
  opts: WatchOptions,
): Promise<number> {
  const dir = expandHome(opts.dir);
  const startedAt = Date.now();
  const seenAtStart = new Set<string>();
  const stagedPaths = new Set<string>();

  // Snapshot existing files
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(dir);
    for (const name of entries) {
      seenAtStart.add(`${dir}/${name}`);
      seenAtStart.add(`${dir}\\${name}`);
    }
  } catch (err) {
    throw new Error(
      `Watch dir not accessible: ${dir} (${err instanceof Error ? err.message : err})`,
    );
  }

  console.error(`Watching: ${dir}`);
  console.error(
    opts.includeVideo
      ? "  Capturing new images and videos created after start."
      : "  Capturing new images created after start. (use --video for recordings)",
  );
  console.error('  Press Enter or type "stop" to upload. Ctrl+C cancels.');

  let stopping = false;
  let count = 0;

  const maybeStage = async (path: string) => {
    if (stopping) return;
    if (looksLikeJunk(path)) return;
    if (seenAtStart.has(path)) return;
    if (stagedPaths.has(path)) return;
    if (!isMediaPath(path, opts.includeVideo)) return;

    try {
      const s = await stat(path);
      // Ignore ancient files that somehow appear
      if (s.mtimeMs + 2000 < startedAt && s.birthtimeMs + 2000 < startedAt) {
        return;
      }
    } catch {
      return;
    }

    const stable = await waitUntilStable(path);
    if (!stable || stopping) return;
    if (stagedPaths.has(path)) return;
    stagedPaths.add(path);

    try {
      const staged = await stageFile(session, path);
      const name = basename(staged);
      count += 1;
      opts.onCaptured?.(name);
      console.error(`  + ${name}  ← ${basename(path)}`);
    } catch (err) {
      stagedPaths.delete(path);
      console.error(`  ! ${err instanceof Error ? err.message : err}`);
    }
  };

  const watcher = chokidarWatch(dir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    depth: 0,
  });

  watcher.on("add", (p) => {
    void maybeStage(p);
  });
  watcher.on("change", (p) => {
    void maybeStage(p);
  });

  const rl = createInterface({ input: process.stdin, output: process.stderr });

  await new Promise<void>((resolve, reject) => {
    const onSigInt = () => {
      stopping = true;
      cleanup();
      reject(Object.assign(new Error("cancelled"), { code: 130 }));
    };

    const cleanup = () => {
      process.off("SIGINT", onSigInt);
      rl.close();
      void watcher.close();
    };

    process.on("SIGINT", onSigInt);

    rl.on("line", (line) => {
      const t = line.trim().toLowerCase();
      if (t === "" || t === "stop" || t === "done" || t === "q") {
        stopping = true;
        cleanup();
        resolve();
      }
    });

    rl.on("close", () => {
      // Ctrl+D
      if (!stopping) {
        stopping = true;
        cleanup();
        resolve();
      }
    });
  });

  // Brief drain for in-flight stages
  await sleep(500);
  return count;
}
