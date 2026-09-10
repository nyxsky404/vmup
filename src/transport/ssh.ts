import { spawn } from "node:child_process";
import { expandHome } from "../constants.js";
import type { ResolvedTarget } from "../config.js";
import { isBatchDirName } from "../stage.js";

export type SshSpec = {
  /** Arguments inserted after `ssh`/`scp` before destination */
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
  opts: { timeoutMs?: number } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer =
      opts.timeoutMs != null
        ? setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`${command} timed out`));
          }, opts.timeoutMs)
        : null;

    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
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

/** Path for scp remote side — OpenSSH does not expand ~ reliably. */
function scpRemotePath(p: string): string {
  if (p.startsWith("~/")) return p.slice(2);
  if (p === "~") return ".";
  return p;
}

/** Expand ~/ on remote via shell; we pass paths as-is to ssh remote commands. */
export async function preflight(target: ResolvedTarget): Promise<void> {
  const spec = buildSshSpec(target);
  const rd = remoteShellPath(target.remoteDir);
  const script = `mkdir -p ${rd} && test -d ${rd} && echo OK`;
  const args = [...spec.baseArgs, spec.destHost, script];
  const res = await run("ssh", args, { timeoutMs: 20_000 });
  if (res.code !== 0 || !res.stdout.includes("OK")) {
    const msg = res.stderr.trim() || res.stdout.trim() || "SSH preflight failed";
    throw new Error(msg);
  }
}

export async function uploadBatch(opts: {
  target: ResolvedTarget;
  localDir: string;
  batchId: string;
}): Promise<string> {
  const { target, localDir, batchId } = opts;
  const spec = buildSshSpec(target);
  const remoteFinal = remoteJoin(target.remoteDir, batchId);
  const remotePartial = `${remoteFinal}.partial`;
  const shellFinal = remoteShellPath(remoteFinal);
  const shellPartial = remoteShellPath(remotePartial);

  // Clean any leftover partial, create partial dir, scp contents, rename.
  const prepare = [
    `rm -rf ${shellPartial} ${shellFinal}`,
    `mkdir -p ${shellPartial}`,
  ].join(" && ");

  const prep = await run("ssh", [...spec.baseArgs, spec.destHost, prepare], {
    timeoutMs: 20_000,
  });
  if (prep.code !== 0) {
    throw new Error(prep.stderr.trim() || "failed to prepare remote dir");
  }

  const scpArgs = [
    "-r",
    ...(target.mode === "direct"
      ? ["-P", String(target.port), ...(target.key ? ["-i", target.key] : [])]
      : []),
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${localDir}/.`,
    `${spec.destHost}:${scpRemotePath(remotePartial)}/`,
  ];

  const scp = await run("scp", scpArgs, { timeoutMs: 600_000 });
  if (scp.code !== 0) {
    await run("ssh", [
      ...spec.baseArgs,
      spec.destHost,
      `rm -rf ${shellPartial}`,
    ]).catch(() => undefined);
    throw new Error(scp.stderr.trim() || "scp failed");
  }

  const finalize = `mv ${shellPartial} ${shellFinal}`;
  const fin = await run("ssh", [...spec.baseArgs, spec.destHost, finalize], {
    timeoutMs: 20_000,
  });
  if (fin.code !== 0) {
    await run("ssh", [
      ...spec.baseArgs,
      spec.destHost,
      `rm -rf ${shellPartial}`,
    ]).catch(() => undefined);
    throw new Error(fin.stderr.trim() || "remote finalize failed");
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

export async function pruneRemote(
  target: ResolvedTarget,
  ttlHours: number,
): Promise<number> {
  const spec = buildSshSpec(target);
  const minutes = Math.max(1, Math.floor(ttlHours * 60));
  const script = `
set -e
dir=${remoteShellPath(target.remoteDir)}
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
  ttlHours: number,
): Promise<void> {
  const spec = buildSshSpec(target);
  const minutes = Math.max(1, Math.floor(ttlHours * 60));
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
    `(crontab -l 2>/dev/null | grep -v '.cleanup.sh' || true; echo '*/10 * * * * ${scriptPathExpr}') | crontab -`,
  ].join(" && ");

  const res = await run("ssh", [...spec.baseArgs, spec.destHost, install], {
    timeoutMs: 30_000,
  });
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "failed to install remote sweeper");
  }
}

export async function scheduleClientDelete(
  target: ResolvedTarget,
  batchId: string,
  ttlHours: number,
): Promise<void> {
  // Best-effort; only runs while this machine stays awake.
  const delaySec = Math.max(60, Math.floor(ttlHours * 3600));
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
