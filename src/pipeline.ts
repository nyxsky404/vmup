import {
  assertTargetConnectable,
  loadConfig,
  resolveTarget,
  type ResolveOptions,
  type ResolvedTarget,
} from "./config.js";
import {
  createStagingSession,
  destroyStaging,
  listStaged,
  stageFile,
  type StagingSession,
} from "./stage.js";
import { validatePaths } from "./validate.js";
import { collectFromArgs } from "./collect/args.js";
import { collectFromPicker } from "./collect/picker.js";
import { collectFromClipboard } from "./collect/clip.js";
import { collectFromWatch } from "./collect/watch.js";
import {
  preflight,
  uploadBatch,
  removeRemoteBatch,
  scheduleClientDelete,
  remoteSweeperPresent,
} from "./transport/ssh.js";
import { emitSuccess, emitJsonError } from "./output.js";
import { EXIT } from "./constants.js";
import { startSpinner, withSpinner, formatBytes } from "./progress.js";
import { color } from "./color.js";
import { stat } from "node:fs/promises";

export type RunOptions = ResolveOptions & {
  json?: boolean;
  force?: boolean;
  keepLocal?: boolean;
  includeVideo?: boolean;
  files?: string[];
  clip?: boolean;
  watch?: boolean;
};

async function withCancelCleanup<T>(
  session: StagingSession,
  fn: () => Promise<T>,
): Promise<T> {
  const onSig = async () => {
    await destroyStaging(session).catch(() => undefined);
    process.exit(EXIT.CANCEL);
  };
  process.on("SIGINT", onSig);
  try {
    return await fn();
  } finally {
    process.off("SIGINT", onSig);
  }
}

export async function runUpload(opts: RunOptions): Promise<number> {
  const cfg = await loadConfig();
  let target: ResolvedTarget;
  try {
    target = resolveTarget(cfg, opts);
    assertTargetConnectable(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) emitJsonError(msg);
    else console.error(msg);
    return EXIT.USAGE;
  }

  if (opts.clip && opts.watch) {
    const msg = "Use either --clip or --watch, not both";
    if (opts.json) emitJsonError(msg);
    else console.error(msg);
    return EXIT.USAGE;
  }

  const includeVideo = opts.includeVideo ?? target.watchIncludeVideo;
  const acceptAll = target.acceptAllFiles;
  const maxBytes = target.maxFileMb * 1024 * 1024;
  const quiet = !!opts.json;
  const session = await createStagingSession();

  const preflightPromise = preflight(target).then(
    () => ({ ok: true as const }),
    (err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }),
  );

  let cancelled = false;

  try {
    await withCancelCleanup(session, async () => {
      if (opts.watch) {
        try {
          await collectFromWatch(session, {
            dir: opts.watchDir ?? target.watchDir,
            includeVideo,
            acceptAll,
          });
        } catch (err) {
          if ((err as { code?: number }).code === 130) {
            cancelled = true;
            return;
          }
          throw err;
        }
      } else if (opts.clip) {
        try {
          await collectFromClipboard(session, { dedup: target.clipDedup });
        } catch (err) {
          if ((err as { code?: number }).code === 130) {
            cancelled = true;
            return;
          }
          throw err;
        }
      } else if (opts.files && opts.files.length > 0) {
        const found = await collectFromArgs(opts.files, {
          includeVideo: true,
          acceptAll,
        });
        const { accepted, skipped } = await validatePaths(found, {
          force: opts.force,
          includeVideo: true,
          acceptAll,
          maxBytes,
        });
        for (const s of skipped) {
          console.error(color.yellow(`skip: ${s.path} (${s.reason})`));
        }
        for (const p of accepted) {
          await stageFile(session, p);
        }
      } else {
        const paths = await collectFromPicker();
        const { accepted, skipped } = await validatePaths(paths, {
          force: opts.force,
          includeVideo,
          acceptAll,
          maxBytes,
        });
        for (const s of skipped) {
          console.error(color.yellow(`skip: ${s.path} (${s.reason})`));
        }
        for (const p of accepted) {
          await stageFile(session, p);
        }
      }
    });

    if (cancelled) {
      await destroyStaging(session);
      return EXIT.CANCEL;
    }

    const staged = await listStaged(session);
    if (staged.length === 0) {
      await destroyStaging(session);
      const msg = "No files to upload";
      if (opts.json) emitJsonError(msg);
      else console.error(msg);
      return EXIT.EMPTY;
    }

    const pf = await withSpinner("Checking SSH…", quiet, () => preflightPromise);
    if (!pf.ok) {
      const msg = `SSH preflight failed: ${pf.error}\nLocal staging kept: ${session.localDir}`;
      if (opts.json) {
        emitJsonError(pf.error, { localStaging: session.localDir });
      } else {
        console.error(color.red(msg));
      }
      return EXIT.SSH;
    }

    let totalBytes = 0;
    for (const p of staged) {
      try {
        totalBytes += (await stat(p)).size;
      } catch {
        // progress only
      }
    }
    const nFiles = staged.length;
    const fileWord = nFiles === 1 ? "file" : "files";
    const uploadLabel = (done: number) =>
      `Uploading ${nFiles} ${fileWord}  ${formatBytes(done)} / ${formatBytes(totalBytes)}`;

    let remotePath: string;
    const spin = startSpinner(uploadLabel(0), quiet);
    try {
      remotePath = await uploadBatch({
        target,
        batchId: session.batchId,
        files: staged,
        onProgress: (uploaded) => spin.update(uploadLabel(uploaded)),
      });
      spin.stop();
    } catch (err) {
      spin.stop();
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await removeRemoteBatch(target, session.batchId);
      } catch {
        // ignore
      }
      if (opts.json) {
        emitJsonError(msg, { localStaging: session.localDir });
      } else {
        console.error(color.red(`Upload failed: ${msg}`));
        console.error(`Local staging kept: ${session.localDir}`);
      }
      return EXIT.UPLOAD;
    }

    if (!opts.keepLocal) {
      await destroyStaging(session);
    } else {
      console.error(`Local staging kept: ${session.localDir}`);
    }

    try {
      await scheduleClientDelete(target, session.batchId, target.ttlMinutes);
    } catch {
      // ignore
    }

    let sweeper: boolean | undefined;
    try {
      sweeper = await remoteSweeperPresent(target);
    } catch {
      sweeper = undefined;
    }

    await emitSuccess({
      json: !!opts.json,
      batchId: session.batchId,
      target,
      remotePath,
      files: staged,
      sweeper,
    });
    return EXIT.OK;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if ((err as { code?: number }).code === 130) {
      await destroyStaging(session).catch(() => undefined);
      return EXIT.CANCEL;
    }
    if (opts.json) emitJsonError(msg, { localStaging: session.localDir });
    else {
      console.error(msg);
      console.error(`Local staging kept: ${session.localDir}`);
    }
    return EXIT.UPLOAD;
  }
}
