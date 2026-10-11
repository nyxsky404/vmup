import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { ResolvedTarget } from "./config.js";
import { renderPrompt } from "./config.js";
import { color } from "./color.js";
import type { ClipboardCopy } from "./constants.js";
import type { SweeperStatus } from "./transport/ssh.js";

export type HumanResult = {
  count: number;
  profileName: string;
  remotePath: string;
  expiresAt: string;
  ttlMinutes: number;
  prompt: string;
  files: string[];
};

export type JsonResult = {
  ok: boolean;
  batchId?: string;
  profile?: string;
  remotePath?: string;
  expiresAt?: string;
  prompt?: string;
  count?: number;
  files?: string[];
  error?: string;
  localStaging?: string;
  sweeper?: boolean;
  sweeperStatus?: SweeperStatus;
};

export function formatExpiryTime(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  });
}

export function buildHumanOutput(r: HumanResult): string {
  const lines = [
    `${color.green(`Uploaded ${r.count} file${r.count === 1 ? "" : "s"}`)} ${color.dim("→")} ${r.profileName}`,
    `${color.dim("Agent folder:")} ${color.cyan(r.remotePath)}`,
    `${color.dim("Expires:")} ${formatExpiryTime(r.expiresAt)} ${color.dim(`(${r.ttlMinutes}-minute TTL)`)}`,
    "",
    color.dim("Prompt:"),
    r.prompt,
  ];
  return lines.join("\n");
}

export function clipboardPayload(
  mode: ClipboardCopy,
  remotePath: string,
  prompt: string,
): { text: string; label: string } | null {
  if (mode === "none") return null;
  if (mode === "path") {
    return { text: remotePath, label: "copied agent folder path to clipboard" };
  }
  return { text: prompt, label: "copied prompt to clipboard" };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const plat = platform();
  try {
    if (plat === "darwin") {
      await runWithStdin("pbcopy", [], text);
      return true;
    }
    if (plat === "linux") {
      try {
        await runWithStdin("wl-copy", [], text);
        return true;
      } catch {
        await runWithStdin("xclip", ["-selection", "clipboard"], text);
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function runWithStdin(
  cmd: string,
  args: string[],
  input: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function emitSuccess(opts: {
  json: boolean;
  batchId: string;
  target: ResolvedTarget;
  remotePath: string;
  expiresAtEpochSeconds: number;
  files: string[];
  sweeperStatus?: SweeperStatus;
}): Promise<void> {
  const remotePath = opts.remotePath.endsWith("/")
    ? opts.remotePath
    : `${opts.remotePath}/`;
  const prompt = renderPrompt(opts.target.promptTemplate, remotePath);
  const fileNames = opts.files.map((f) => f.split(/[/\\]/).pop()!);
  const expiresAt = new Date(opts.expiresAtEpochSeconds * 1000).toISOString();

  if (opts.json) {
    const payload: JsonResult = {
      ok: true,
      batchId: opts.batchId,
      profile: opts.target.profileName,
      remotePath,
      expiresAt,
      prompt,
      count: opts.files.length,
      files: fileNames,
      sweeper:
        opts.sweeperStatus == null
          ? undefined
          : opts.sweeperStatus !== "missing",
      sweeperStatus: opts.sweeperStatus,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(
    buildHumanOutput({
      count: opts.files.length,
      profileName: opts.target.profileName,
      remotePath,
      expiresAt,
      ttlMinutes: opts.target.ttlMinutes,
      prompt,
      files: fileNames,
    }),
  );

  const payload = clipboardPayload(
    opts.target.clipboardCopy,
    remotePath,
    prompt,
  );
  if (payload) {
    const ok = await copyToClipboard(payload.text);
    if (!ok) {
      console.error(color.dim("(clipboard copy unavailable)"));
    } else {
      console.error(color.dim(`(${payload.label})`));
    }
  }

  if (opts.sweeperStatus === "missing") {
    console.error("");
    console.error(
      color.yellow("Remote sweeper is not installed.") +
        color.dim(" Batches may linger after TTL if this machine sleeps."),
    );
    console.error(color.dim("  Reinstall:  vmup check --sweeper"));
  } else if (opts.sweeperStatus === "outdated") {
    console.error("");
    console.error(
      color.yellow("Remote sweeper is outdated.") +
        color.dim(" Cleanup may run early or not run at all."),
    );
    console.error(color.dim("  Upgrade:  vmup check --sweeper"));
  }
}

export function emitJsonError(
  error: string,
  extra: Partial<JsonResult> = {},
): void {
  const payload: JsonResult = { ok: false, error, ...extra };
  console.log(JSON.stringify(payload, null, 2));
}
