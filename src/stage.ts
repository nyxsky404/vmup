import { randomUUID } from "node:crypto";
import { mkdir, rm, readdir, copyFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { BATCH_PREFIX, cacheDir } from "./constants.js";
import { fileKind, type FileKind } from "./validate.js";

export function createBatchId(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${BATCH_PREFIX}-${y}${m}${d}-${hh}${mm}${ss}-${randomUUID()}`;
}

export function isBatchDirName(name: string): boolean {
  return /^agents-\d{8}-\d{6}-[0-9a-f-]{36}$/i.test(name);
}

export type StagingSession = {
  batchId: string;
  localDir: string;
  files: string[];
  kindCounts: Record<FileKind, number>;
};

export async function createStagingSession(): Promise<StagingSession> {
  const batchId = createBatchId();
  const localDir = join(cacheDir(), batchId);
  await mkdir(localDir, { recursive: true });
  return {
    batchId,
    localDir,
    files: [],
    kindCounts: { image: 0, video: 0, file: 0 },
  };
}

export async function destroyStaging(session: StagingSession): Promise<void> {
  await rm(session.localDir, { recursive: true, force: true });
}

export function stagedName(kind: FileKind, index: number, sourcePath: string): string {
  const ext = extname(sourcePath).toLowerCase() || (kind === "image" ? ".png" : "");
  return `${kind}-${String(index).padStart(2, "0")}${ext}`;
}

export async function stageFile(
  session: StagingSession,
  sourcePath: string,
): Promise<string> {
  const kind = fileKind(sourcePath);
  session.kindCounts[kind] += 1;
  const name = stagedName(kind, session.kindCounts[kind], sourcePath);
  const dest = join(session.localDir, name);
  await copyFile(sourcePath, dest);
  session.files.push(dest);
  return dest;
}

export async function listStaged(session: StagingSession): Promise<string[]> {
  return [...session.files];
}

export async function pruneLocalOrphans(maxAgeHours = 24): Promise<number> {
  const root = cacheDir();
  let removed = 0;
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return 0;
  }
  const cutoff = Date.now() - maxAgeHours * 3600_000;
  for (const name of entries) {
    if (!isBatchDirName(name) && !name.startsWith(`${BATCH_PREFIX}-`)) continue;
    const full = join(root, name);
    try {
      const s = await stat(full);
      if (s.isDirectory() && s.mtimeMs < cutoff) {
        await rm(full, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // ignore
    }
  }
  return removed;
}

export { basename };
