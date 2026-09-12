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
    const rest = p.slice(2).replace(/"/g, '\\"');
    return `"$HOME/${rest}"`;
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
  onProgress?: (uploadedBytes: number) => void;
}): Promise<string> {
  const { target, batchId, files } = opts;
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remotePartial = `${remoteFinal}.partial`;
  const shellFinal = remoteShellPath(remoteFinal);
  const shellPartial = remoteShellPath(remotePartial);

  const prepare = [
    `rm -rf ${shellPartial} ${shellFinal}`,
    `mkdir -p ${shellPartial}`,
  ].join(" && ");

  const prep = await run("ssh", [...spec.baseArgs, spec.destHost, prepare], {
    timeoutMs: 20_000,
  });
  if (prep.code !== 0) {
    throw new Error(formatSshError(prep.stderr.trim() || "failed to prepare remote dir"));
  }

  const cleanupPartial = () =>
    run("ssh", [
      ...spec.baseArgs,
      spec.destHost,
      `rm -rf ${shellPartial}`,
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
    await cleanupPartial();
    throw err;
  }

  const finalize = `mv ${shellPartial} ${shellFinal}`;
  const fin = await run("ssh", [...spec.baseArgs, spec.destHost, finalize], {
    timeoutMs: 20_000,
  });
  if (fin.code !== 0) {
    await cleanupPartial();
    throw new Error(formatSshError(fin.stderr.trim() || "remote finalize failed"));
  }

  return remoteFinal;
}

export async function removeRemoteBatch(
  target: ResolvedTarget,
  batchId: string,
): Promise<void> {
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remotePartial = `${remoteFinal}.partial`;
  await run("ssh", [
    ...spec.baseArgs,
    spec.destHost,
    `rm -rf ${remoteShellPath(remoteFinal)} ${remoteShellPath(remotePartial)}`,
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
echo $count
`.trim();
  }
  const minutes = Math.max(1, Math.floor(opts.ttlMinutes));
  return `
set -e
dir=${dir}
count=0
for d in "$dir"/agents-*; do
  [ -d "$d" ] || continue
  base=$(basename "$d")
  case "$base" in
    *.partial) rm -rf "$d"; count=$((count+1)); continue ;;
  esac
  if find "$d" -maxdepth 0 -type d -mmin +${minutes} | grep -q .; then
    rm -rf "$d"
    count=$((count+1))
  fi
done
echo $count
`.trim();
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
  const minutes = Math.max(1, Math.floor(ttlMinutes));
  const scriptPath = remoteJoin(target.remoteDir, ".cleanup.sh");
  const dirExpr = target.remoteDir.startsWith("~/")
    ? `$HOME/${target.remoteDir.slice(2)}`
    : target.remoteDir;
  const scriptPathExpr = target.remoteDir.startsWith("~/")
    ? `$HOME/${target.remoteDir.slice(2)}/.cleanup.sh`
    : scriptPath;
  const scriptBody = `#!/bin/bash
set -euo pipefail
DIR="${dirExpr}"
find "$DIR" -maxdepth 1 -type d -name 'agents-*' -mmin +${minutes} -exec rm -rf {} +
find "$DIR" -maxdepth 1 -type d -name 'agents-*.partial' -mmin +${minutes} -exec rm -rf {} +
`;

  const b64 = Buffer.from(scriptBody, "utf8").toString("base64");
  const install = [
    `mkdir -p ${remoteShellPath(target.remoteDir)}`,
    `echo ${shellQuote(b64)} | base64 -d > ${remoteShellPath(scriptPath)}`,
    `chmod +x ${remoteShellPath(scriptPath)}`,
    `(crontab -l 2>/dev/null | grep -v '.cleanup.sh' || true; echo '* * * * * ${scriptPathExpr}') | crontab -`,
  ].join(" && ");

  const res = await run("ssh", [...spec.baseArgs, spec.destHost, install], {
    timeoutMs: 30_000,
  });
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "failed to install remote sweeper");
  }
}

export async function remoteSweeperPresent(
  target: ResolvedTarget,
): Promise<boolean> {
  const spec = buildSshSpec(target);
  const scriptPath = remoteJoin(target.remoteDir, ".cleanup.sh");
  const res = await run(
    "ssh",
    [
      ...spec.baseArgs,
      spec.destHost,
      `test -x ${remoteShellPath(scriptPath)} && echo YES || echo NO`,
    ],
    { timeoutMs: 15_000 },
  );
  return res.stdout.includes("YES");
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
  const sshCmd = [
    "ssh",
    ...spec.baseArgs,
    spec.destHost,
    `rm -rf ${remoteShellPath(remoteFinal)}`,
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
