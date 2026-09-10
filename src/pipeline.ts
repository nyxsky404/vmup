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
} from "./transport/ssh.js";
import { emitSuccess, emitJsonError } from "./output.js";
import { EXIT } from "./constants.js";

export type RunOptions = ResolveOptions & {
  json?: boolean;
  force?: boolean;
  keepLocal?: boolean;
  includeVideo?: boolean;
  files?: string[];
  clip?: boolean;
  watch?: boolean;
  copy?: boolean;
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

  const includeVideo = opts.includeVideo ?? target.watchIncludeVideo;
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
      // Collect
      if (opts.watch) {
        try {
          await collectFromWatch(session, {
            dir: opts.watchDir ?? target.watchDir,
            includeVideo,
          });
        } catch (err) {
          if ((err as { code?: number }).code === 130) {
            cancelled = true;
            return;
          }
          throw err;
        }
      } else if (opts.clip) {
        await collectFromClipboard(session);
      } else if (opts.files && opts.files.length > 0) {
        // Explicit paths: allow images + videos (user chose them).
        const found = await collectFromArgs(opts.files, true);
        const { accepted, skipped } = await validatePaths(found, {
          force: opts.force,
          includeVideo: true,
        });
        for (const s of skipped) {
          console.error(`skip: ${s.path} (${s.reason})`);
        }
        for (const p of accepted) {
          await stageFile(session, p);
        }
      } else {
        // Parallel: picker while preflight runs
        const paths = await collectFromPicker();
        const { accepted, skipped } = await validatePaths(paths, {
          force: opts.force,
          includeVideo,
        });
        for (const s of skipped) {
          console.error(`skip: ${s.path} (${s.reason})`);
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
      const msg = "No media to upload";
      if (opts.json) emitJsonError(msg);
      else console.error(msg);
      return EXIT.EMPTY;
    }

    // Await preflight before upload
    const pf = await preflightPromise;
    if (!pf.ok) {
      const msg = `SSH preflight failed: ${pf.error}\nLocal staging kept: ${session.localDir}`;
      if (opts.json) {
        emitJsonError(pf.error, { localStaging: session.localDir });
      } else {
        console.error(msg);
      }
      return EXIT.SSH;
    }

    let remotePath: string;
    try {
      remotePath = await uploadBatch({
        target,
        localDir: session.localDir,
        batchId: session.batchId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await removeRemoteBatch(target, session.batchId);
      } catch {
        // ignore
      }
      if (opts.json) {
        emitJsonError(msg, { localStaging: session.localDir });
      } else {
        console.error(`Upload failed: ${msg}`);
        console.error(`Local staging kept: ${session.localDir}`);
      }
      return EXIT.UPLOAD;
    }

    if (!opts.keepLocal) {
      await destroyStaging(session);
    } else {
      console.error(`Local staging kept: ${session.localDir}`);
    }

    // Best-effort client-side TTL fallback
    try {
      await scheduleClientDelete(target, session.batchId, target.ttlHours);
    } catch {
      // ignore
    }

    await emitSuccess({
      json: !!opts.json,
      batchId: session.batchId,
      target,
      remotePath,
      files: staged,
      copy: opts.copy,
    });
    return EXIT.OK;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if ((err as { code?: number }).code === 130) {
      await destroyStaging(session).catch(() => undefined);
      return EXIT.CANCEL;
    }
    // Keep staging on unexpected failure
    if (opts.json) emitJsonError(msg, { localStaging: session.localDir });
    else {
      console.error(msg);
      console.error(`Local staging kept: ${session.localDir}`);
    }
    return EXIT.UPLOAD;
  }
}
