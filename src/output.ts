import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { ResolvedTarget } from "./config.js";
import { renderPrompt } from "./config.js";
import { color } from "./color.js";

export type HumanResult = {
  count: number;
  profileName: string;
  remotePath: string;
  prompt: string;
  files: string[];
};

export type JsonResult = {
  ok: boolean;
  batchId?: string;
  profile?: string;
  remotePath?: string;
  prompt?: string;
  count?: number;
  files?: string[];
  error?: string;
  localStaging?: string;
  sweeper?: boolean;
};

export function buildHumanOutput(r: HumanResult): string {
  const lines = [
    `${color.green(`Uploaded ${r.count} file${r.count === 1 ? "" : "s"}`)} ${color.dim("→")} ${r.profileName}`,
    `${color.dim("Agent folder:")} ${color.cyan(r.remotePath)}`,
    "",
    color.dim("Prompt:"),
    r.prompt,
  ];
  return lines.join("\n");
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
  files: string[];
  copy?: boolean;
  sweeper?: boolean;
}): Promise<void> {
  const remotePath = opts.remotePath.endsWith("/")
    ? opts.remotePath
    : `${opts.remotePath}/`;
  const prompt = renderPrompt(opts.target.promptTemplate, remotePath);
  const fileNames = opts.files.map((f) => f.split(/[/\\]/).pop()!);

  if (opts.json) {
    const payload: JsonResult = {
      ok: true,
      batchId: opts.batchId,
      profile: opts.target.profileName,
      remotePath,
      prompt,
      count: opts.files.length,
      files: fileNames,
      sweeper: opts.sweeper,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(
    buildHumanOutput({
      count: opts.files.length,
      profileName: opts.target.profileName,
      remotePath,
      prompt,
      files: fileNames,
    }),
  );

  if (opts.copy !== false) {
    const ok = await copyToClipboard(remotePath);
    if (!ok) {
      console.error(color.dim("(clipboard copy unavailable)"));
    } else {
      console.error(color.dim("(copied agent folder path to clipboard)"));
    }
  }

  if (opts.sweeper === false) {
    console.error("");
    console.error(
      color.yellow("Remote sweeper is not installed.") +
        color.dim(" Batches may linger after TTL if this machine sleeps."),
    );
    console.error(color.dim("  Reinstall:  vmup check --sweeper"));
  }
}

export function emitJsonError(
  error: string,
  extra: Partial<JsonResult> = {},
): void {
  const payload: JsonResult = { ok: false, error, ...extra };
  console.log(JSON.stringify(payload, null, 2));
}
