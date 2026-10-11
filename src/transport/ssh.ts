import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import type { Readable } from "node:stream";
import { expandHome } from "../constants.js";
import type { ResolvedTarget } from "../config.js";
import { isBatchDirName } from "../stage.js";
import { assertKeyUsable, formatSshError } from "../ssh-key.js";
import { countBytes } from "../progress.js";

export type SshSpec = {
  /** Arguments inserted after `ssh` before destination */
  baseArgs: string[];
  /** Destination host part: user@host or alias */
  destHost: string;
};

export type SweeperStatus = "current" | "outdated" | "missing";

export type UploadBatchResult = {
  remotePath: string;
  expiresAtEpochSeconds: number;
};

export const SWEEPER_VERSION = 2;
export const PARTIAL_STALE_MINUTES = 15;

export function buildSshSpec(target: ResolvedTarget): SshSpec {
  if (target.mode === "ssh_host") {
    return {
      baseArgs: [],
      destHost: target.sshHostAlias!,
    };
  }
  const args: string[] = ["-p", String(target.port)];
  if (target.key) {
    args.push("-i", target.key);
  }
  args.push("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new");
  return {
    baseArgs: args,
    destHost: `${target.user}@${target.host}`,
  };
}

function run(
  command: string,
  args: string[],
  opts: {
    timeoutMs?: number;
    stdin?: Readable;
    onStdinBytes?: (n: number) => void;
  } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [opts.stdin ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };
    const stopStdin = () => {
      if (!opts.stdin) return;
      opts.stdin.unpipe();
      opts.stdin.destroy();
    };
    const timer =
      opts.timeoutMs != null
        ? setTimeout(() => {
            stopStdin();
            child.kill("SIGKILL");
            settle(() => reject(new Error(`${command} timed out`)));
          }, opts.timeoutMs)
        : null;

    if (opts.stdin && child.stdin) {
      child.stdin.on("error", () => {
        // ssh closed stdin (EPIPE); the close handler reports the exit code
      });
      opts.stdin.on("error", (err) => {
        child.kill("SIGKILL");
        settle(() => reject(err));
      });
      const src = opts.onStdinBytes
        ? opts.stdin.pipe(countBytes(opts.onStdinBytes))
        : opts.stdin;
      src.on("error", () => undefined);
      src.pipe(child.stdin);
    }

    child.stdout!.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr!.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      stopStdin();
      settle(() => reject(err));
    });
    child.on("close", (code) => {
      stopStdin();
      settle(() => resolve({ code: code ?? 1, stdout, stderr }));
    });
  });
}

export function remoteJoin(remoteDir: string, ...parts: string[]): string {
  const base = remoteDir.replace(/\/+$/, "");
  const rest = parts.join("/").replace(/^\/+/, "");
  return `${base}/${rest}`;
}

/** Path safe for remote bash (expands ~/ via $HOME). */
function remoteShellPath(p: string): string {
  if (p === "~") return '"$HOME"';
  if (p.startsWith("~/")) {
    return `"$HOME"/${shellQuote(p.slice(2))}`;
  }
  return shellQuote(p);
}

/** Expand ~/ on remote via shell; we pass paths as-is to ssh remote commands. */
export async function preflight(target: ResolvedTarget): Promise<void> {
  if (target.mode === "direct" && target.key) {
    await assertKeyUsable(target.key);
  }
  const spec = buildSshSpec(target);
  const rd = remoteShellPath(target.remoteDir);
  const script = `mkdir -p ${rd} && test -d ${rd} && echo OK`;
  const args = [...spec.baseArgs, spec.destHost, script];
  const res = await run("ssh", args, { timeoutMs: 20_000 });
  if (res.code !== 0 || !res.stdout.includes("OK")) {
    const msg = res.stderr.trim() || res.stdout.trim() || "SSH preflight failed";
    throw new Error(formatSshError(msg));
  }
}

export async function uploadBatch(opts: {
  target: ResolvedTarget;
  batchId: string;
  files: string[];
  ttlMinutes: number;
  onProgress?: (uploadedBytes: number) => void;
}): Promise<UploadBatchResult> {
  const { target, batchId, files } = opts;
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remotePartial = `${remoteFinal}.partial`;
  const remoteExpiry = remoteJoin(target.remoteDir, `.${batchId}.expires`);
  const remoteExpiryPartial = `${remoteExpiry}.partial`;
  const shellFinal = remoteShellPath(remoteFinal);
  const shellPartial = remoteShellPath(remotePartial);
  const shellExpiry = remoteShellPath(remoteExpiry);
  const shellExpiryPartial = remoteShellPath(remoteExpiryPartial);

  const prepare = [
    `rm -rf ${shellPartial} ${shellFinal}`,
    `rm -f ${shellExpiryPartial} ${shellExpiry}`,
    `mkdir -p ${shellPartial}`,
  ].join(" && ");

  const prep = await run("ssh", [...spec.baseArgs, spec.destHost, prepare], {
    timeoutMs: 20_000,
  });
  if (prep.code !== 0) {
    throw new Error(formatSshError(prep.stderr.trim() || "failed to prepare remote dir"));
  }

  const cleanupUpload = () =>
    run("ssh", [
      ...spec.baseArgs,
      spec.destHost,
      `rm -rf ${shellPartial} ${shellFinal}; rm -f ${shellExpiryPartial} ${shellExpiry}`,
    ]).catch(() => undefined);

  try {
    let uploaded = 0;
    for (const file of files) {
      let size = 0;
      try {
        size = (await stat(file)).size;
      } catch {
        // size is only for progress
      }
      const remoteFile = remoteShellPath(remoteJoin(remotePartial, basename(file)));
      const put = await run(
        "ssh",
        [...spec.baseArgs, spec.destHost, `cat > ${remoteFile}`],
        {
          timeoutMs: 600_000,
          stdin: createReadStream(file),
          onStdinBytes: (n) => opts.onProgress?.(uploaded + n),
        },
      );
      if (put.code !== 0) {
        throw new Error(formatSshError(put.stderr.trim() || "upload failed"));
      }
      uploaded += size;
      opts.onProgress?.(uploaded);
    }
  } catch (err) {
    await cleanupUpload();
    throw err;
  }

  const ttlSeconds = Math.max(60, Math.floor(opts.ttlMinutes * 60));
  const finalize = [
    "set -e",
    `expires_at=$(($(date +%s) + ${ttlSeconds}))`,
    `printf '%s\\n' "$expires_at" > ${shellExpiryPartial}`,
    `mv ${shellExpiryPartial} ${shellExpiry}`,
    `mv ${shellPartial} ${shellFinal}`,
    `printf '%s\\n' "$expires_at"`,
  ].join("\n");
  const fin = await run("ssh", [...spec.baseArgs, spec.destHost, finalize], {
    timeoutMs: 20_000,
  });
  if (fin.code !== 0) {
    await cleanupUpload();
    throw new Error(formatSshError(fin.stderr.trim() || "remote finalize failed"));
  }

  const expiresAtEpochSeconds = Number(fin.stdout.trim().split("\n").pop());
  if (!Number.isSafeInteger(expiresAtEpochSeconds) || expiresAtEpochSeconds <= 0) {
    await cleanupUpload();
    throw new Error("remote finalize returned an invalid expiry time");
  }

  return { remotePath: remoteFinal, expiresAtEpochSeconds };
}

export async function removeRemoteBatch(
  target: ResolvedTarget,
  batchId: string,
): Promise<void> {
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remotePartial = `${remoteFinal}.partial`;
  const remoteExpiry = remoteJoin(target.remoteDir, `.${batchId}.expires`);
  const remoteExpiryPartial = `${remoteExpiry}.partial`;
  await run("ssh", [
    ...spec.baseArgs,
    spec.destHost,
    [
      `rm -rf ${remoteShellPath(remoteFinal)} ${remoteShellPath(remotePartial)}`,
      `rm -f ${remoteShellPath(remoteExpiry)} ${remoteShellPath(remoteExpiryPartial)}`,
    ].join("; "),
  ]);
}

export function remotePruneScript(
  remoteDir: string,
  opts: { ttlMinutes: number; all?: boolean } = { ttlMinutes: 5 },
): string {
  const dir = remoteShellPath(remoteDir);
  if (opts.all) {
    return `
set -e
dir=${dir}
count=0
for d in "$dir"/agents-*; do
  [ -d "$d" ] || continue
  rm -rf "$d"
  count=$((count+1))
done
rm -f "$dir"/.agents-*.expires "$dir"/.agents-*.expires.partial
echo $count
`.trim();
  }
  const minutes = Math.max(1, Math.floor(opts.ttlMinutes));
  return `
set -e
dir=${dir}
count=0
now=$(date +%s)
for d in "$dir"/agents-*; do
  [ -d "$d" ] || continue
  base=$(basename "$d")
  case "$base" in
    *.partial)
      if find "$d" -maxdepth 0 -type d -mmin +${PARTIAL_STALE_MINUTES} | grep -q .; then
        rm -rf "$d"
        count=$((count+1))
      fi
      continue
      ;;
  esac
  marker="$dir/.$base.expires"
  expires_at=""
  if [ -f "$marker" ]; then
    expires_at=$(cat "$marker" 2>/dev/null || true)
    case "$expires_at" in
      ''|*[!0-9]*|???????????????????*) expires_at="" ;;
    esac
  fi
  if [ -n "$expires_at" ] && [ "$now" -ge "$expires_at" ]; then
    rm -rf "$d"
    rm -f "$marker"
    count=$((count+1))
  elif [ -z "$expires_at" ] && find "$d" -maxdepth 0 -type d -mmin +${minutes} | grep -q .; then
    rm -rf "$d"
    rm -f "$marker"
    count=$((count+1))
  fi
done
for marker in "$dir"/.agents-*.expires; do
  [ -f "$marker" ] || continue
  base=$(basename "$marker")
  batch=\${base#.}
  batch=\${batch%.expires}
  [ -d "$dir/$batch" ] || [ -d "$dir/$batch.partial" ] || rm -f "$marker"
done
for marker in "$dir"/.agents-*.expires.partial; do
  [ -f "$marker" ] || continue
  if find "$marker" -maxdepth 0 -type f -mmin +${PARTIAL_STALE_MINUTES} | grep -q .; then
    rm -f "$marker"
  fi
done
echo $count
`.trim();
}

export function remoteSweeperScript(
  remoteDir: string,
  ttlMinutes: number,
): string {
  const dirExpr = remoteShellPath(remoteDir);
  const minutes = Math.max(1, Math.floor(ttlMinutes));
  return `#!/bin/bash
# vmup-sweeper-version: ${SWEEPER_VERSION}
set -euo pipefail
DIR=${dirExpr}
now=$(date +%s)
for d in "$DIR"/agents-*; do
  [ -d "$d" ] || continue
  base=$(basename "$d")
  case "$base" in
    *.partial)
      if find "$d" -maxdepth 0 -type d -mmin +${PARTIAL_STALE_MINUTES} | grep -q .; then
        rm -rf "$d"
      fi
      continue
      ;;
  esac
  marker="$DIR/.$base.expires"
  expires_at=""
  if [ -f "$marker" ]; then
    expires_at=$(cat "$marker" 2>/dev/null || true)
    case "$expires_at" in
      ''|*[!0-9]*|???????????????????*) expires_at="" ;;
    esac
  fi
  if [ -n "$expires_at" ] && [ "$now" -ge "$expires_at" ]; then
    rm -rf "$d"
    rm -f "$marker"
  elif [ -z "$expires_at" ] && find "$d" -maxdepth 0 -type d -mmin +${minutes} | grep -q .; then
    rm -rf "$d"
    rm -f "$marker"
  fi
done
for marker in "$DIR"/.agents-*.expires; do
  [ -f "$marker" ] || continue
  base=$(basename "$marker")
  batch=\${base#.}
  batch=\${batch%.expires}
  [ -d "$DIR/$batch" ] || [ -d "$DIR/$batch.partial" ] || rm -f "$marker"
done
for marker in "$DIR"/.agents-*.expires.partial; do
  [ -f "$marker" ] || continue
  if find "$marker" -maxdepth 0 -type f -mmin +${PARTIAL_STALE_MINUTES} | grep -q .; then
    rm -f "$marker"
  fi
done
`;
}

export async function pruneRemote(
  target: ResolvedTarget,
  ttlMinutes: number,
  opts: { all?: boolean } = {},
): Promise<number> {
  const spec = buildSshSpec(target);
  const script = remotePruneScript(target.remoteDir, {
    ttlMinutes,
    all: opts.all,
  });

  const res = await run("ssh", [...spec.baseArgs, spec.destHost, script], {
    timeoutMs: 60_000,
  });
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "remote prune failed");
  }
  const n = Number(res.stdout.trim().split("\n").pop());
  return Number.isFinite(n) ? n : 0;
}

export async function installRemoteSweeper(
  target: ResolvedTarget,
  ttlMinutes: number,
): Promise<void> {
  const spec = buildSshSpec(target);
  const scriptPath = remoteJoin(target.remoteDir, ".cleanup.sh");
  const scriptBody = remoteSweeperScript(target.remoteDir, ttlMinutes);
  const cronLine = `* * * * * ${remoteShellPath(scriptPath)}`;

  const b64 = Buffer.from(scriptBody, "utf8").toString("base64");
  const install = [
    `mkdir -p ${remoteShellPath(target.remoteDir)}`,
    `echo ${shellQuote(b64)} | base64 -d > ${remoteShellPath(scriptPath)}`,
    `chmod +x ${remoteShellPath(scriptPath)}`,
    `(crontab -l 2>/dev/null | grep -v '.cleanup.sh' || true; echo ${shellQuote(cronLine)}) | crontab -`,
  ].join(" && ");

  const res = await run("ssh", [...spec.baseArgs, spec.destHost, install], {
    timeoutMs: 30_000,
  });
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "failed to install remote sweeper");
  }
}

export async function remoteSweeperStatus(
  target: ResolvedTarget,
): Promise<SweeperStatus> {
  const spec = buildSshSpec(target);
  const scriptPath = remoteJoin(target.remoteDir, ".cleanup.sh");
  const marker = `# vmup-sweeper-version: ${SWEEPER_VERSION}`;
  const cronLine = `* * * * * ${remoteShellPath(scriptPath)}`;
  const res = await run(
    "ssh",
    [
      ...spec.baseArgs,
      spec.destHost,
      [
        `if [ ! -x ${remoteShellPath(scriptPath)} ]; then`,
        "  echo MISSING",
        `elif ! grep -Fq ${shellQuote(marker)} ${remoteShellPath(scriptPath)}; then`,
        "  echo OUTDATED",
        `elif ! crontab -l 2>/dev/null | grep -Fqx ${shellQuote(cronLine)}; then`,
        "  echo OUTDATED",
        "else",
        "  echo CURRENT",
        "fi",
      ].join("\n"),
    ],
    { timeoutMs: 15_000 },
  );
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "failed to inspect remote sweeper");
  }
  if (res.stdout.includes("CURRENT")) return "current";
  if (res.stdout.includes("OUTDATED")) return "outdated";
  return "missing";
}

export async function scheduleClientDelete(
  target: ResolvedTarget,
  batchId: string,
  ttlMinutes: number,
): Promise<void> {
  // Best-effort; only runs while this machine stays awake.
  const delaySec = Math.max(60, Math.floor(ttlMinutes * 60));
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remoteExpiry = remoteJoin(target.remoteDir, `.${batchId}.expires`);
  const sshCmd = [
    "ssh",
    ...spec.baseArgs,
    spec.destHost,
    `rm -rf ${remoteShellPath(remoteFinal)}; rm -f ${remoteShellPath(remoteExpiry)}`,
  ]
    .map(shellQuote)
    .join(" ");
  const child = spawn(
    "bash",
    ["-c", `sleep ${delaySec} && ${sshCmd}`],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function expandRemoteTildeForDisplay(remotePath: string): string {
  return remotePath;
}

// Used by tests / prune --id validation
export function assertBatchId(id: string): void {
  if (!isBatchDirName(id)) {
    throw new Error(`Invalid batch id: ${id}`);
  }
}

export { expandHome };
