import { watch as chokidarWatch } from "chokidar";
import { createInterface } from "node:readline";
import { readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { expandHome } from "../constants.js";
import type { StagingSession } from "../stage.js";
import { stageFile } from "../stage.js";
import { color } from "../color.js";
import { isAllowedPath } from "../validate.js";
import { looksLikeJunk } from "./args.js";

export type WatchOptions = {
  dir: string;
  includeVideo: boolean;
  acceptAll: boolean;
  onCaptured?: (name: string) => void;
};

function wait(ms: number): Promise<void> {
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
    await wait(350);
  }
  return last > 0;
}

/**
 * Foreground folder watcher. Ignores files that were already in the folder
 * at start (unless they are overwritten). Finder copies often keep the original
 * timestamps, so new names are captured even when mtime is old.
 * Stop with Enter, "stop", or Ctrl+D → upload.
 * Ctrl+C → cancel (caller handles).
 */
export async function collectFromWatch(
  session: StagingSession,
  opts: WatchOptions,
): Promise<number> {
  const dir = resolve(expandHome(opts.dir));
  const initialNames = new Set<string>();
  const stagedPaths = new Set<string>();

  try {
    const entries = await readdir(dir);
    for (const name of entries) initialNames.add(name);
  } catch (err) {
    throw new Error(
      `Watch dir not accessible: ${dir} (${err instanceof Error ? err.message : err})`,
    );
  }

  console.error(color.bold(`Watching: ${dir}`));
  console.error(
    color.dim(
      opts.acceptAll
        ? "  Capturing files added or copied after start (existing files ignored)."
        : opts.includeVideo
          ? "  Capturing new images and videos created after start."
          : "  Capturing new images created after start. (use --video for recordings, or accept_all_files in config)",
    ),
  );
  console.error(color.dim('  Press Enter or type "stop" to upload. Ctrl+C cancels.'));

  let stopping = false;
  let count = 0;

  const maybeStage = async (path: string, allowExisting: boolean) => {
    if (stopping) return;
    const full = join(dir, basename(path));
    const name = basename(full);
    if (!allowExisting && initialNames.has(name)) return;
    if (looksLikeJunk(full)) return;
    if (stagedPaths.has(full)) return;
    if (!isAllowedPath(full, { includeVideo: opts.includeVideo, acceptAll: opts.acceptAll })) {
      return;
    }

    try {
      const s = await stat(full);
      if (!s.isFile()) return;
    } catch {
      return;
    }

    const stable = await waitUntilStable(full);
    if (!stable || stopping) return;
    if (stagedPaths.has(full)) return;
    stagedPaths.add(full);

    try {
      const staged = await stageFile(session, full);
      const stagedName = basename(staged);
      count += 1;
      opts.onCaptured?.(stagedName);
      console.error(color.green(`  + ${stagedName}  ← ${name}`));
    } catch (err) {
      stagedPaths.delete(full);
      console.error(`  ! ${err instanceof Error ? err.message : err}`);
    }
  };

  const scanNew = async () => {
    if (stopping) return;
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (initialNames.has(name)) continue;
      await maybeStage(join(dir, name), false);
    }
  };

  const watcher = chokidarWatch(dir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    depth: 0,
    ignorePermissionErrors: true,
  });

  watcher.on("add", (p) => {
    void maybeStage(p, false);
  });
  watcher.on("change", (p) => {
    void maybeStage(p, true);
  });

  const scanTimer = setInterval(() => {
    void scanNew();
  }, 1000);

  const rl = createInterface({ input: process.stdin, output: process.stderr });

  await new Promise<void>((resolvePromise, reject) => {
    const onSigInt = () => {
      stopping = true;
      cleanup();
      reject(Object.assign(new Error("cancelled"), { code: 130 }));
    };

    const cleanup = () => {
      process.off("SIGINT", onSigInt);
      clearInterval(scanTimer);
      rl.close();
      void watcher.close();
    };

    process.on("SIGINT", onSigInt);

    rl.on("line", (line) => {
      const t = line.trim().toLowerCase();
      if (t === "" || t === "stop" || t === "done" || t === "q") {
        stopping = true;
        cleanup();
        resolvePromise();
      }
    });

    rl.on("close", () => {
      if (!stopping) {
        stopping = true;
        cleanup();
        resolvePromise();
      }
    });
  });

  await wait(500);
  try {
    process.stdin.pause();
  } catch {
    // ignore
  }
  if (count > 0) {
    console.error(color.dim(`Captured ${count} file${count === 1 ? "" : "s"}.`));
  }
  return count;
}
