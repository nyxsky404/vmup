import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { platform } from "node:os";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import type { StagingSession } from "../stage.js";
import { stageFile } from "../stage.js";

function run(
  command: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const res = await run("which", [cmd]);
    return res.code === 0;
  } catch {
    return false;
  }
}

function runToFile(
  command: string,
  args: string[],
  dest: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(dest);
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let bytes = 0;
    child.stdout.on("data", (d: Buffer) => {
      bytes += d.length;
      out.write(d);
    });
    child.on("error", (err) => {
      out.destroy();
      reject(err);
    });
    child.on("close", (code) => {
      out.end(() => resolve(code === 0 && bytes > 32));
    });
  });
}

async function saveClipboardImage(destPng: string): Promise<boolean> {
  const plat = platform();
  if (plat === "darwin") {
    if (!(await commandExists("pngpaste"))) {
      throw new Error(
        "pngpaste not found. Install with: brew install pngpaste",
      );
    }
    const res = await run("pngpaste", [destPng]);
    return res.code === 0;
  }
  if (plat === "linux") {
    if (await commandExists("wl-paste")) {
      if (await runToFile("wl-paste", ["-t", "image/png"], destPng)) return true;
    }
    if (await commandExists("xclip")) {
      if (
        await runToFile(
          "xclip",
          ["-selection", "clipboard", "-t", "image/png", "-o"],
          destPng,
        )
      ) {
        return true;
      }
    }
    throw new Error(
      "No clipboard image tool found. Install wl-paste or xclip.",
    );
  }
  throw new Error("Clipboard capture not supported on this platform");
}

/**
 * Interactive clipboard loop.
 * Press Enter to capture current clipboard image.
 * Type "done"/"stop" or Ctrl+D to finish. Ctrl+C cancels.
 */
export async function collectFromClipboard(
  session: StagingSession,
  onCaptured?: (name: string) => void,
): Promise<number> {
  const tmp = join(session.localDir, ".clip-tmp");
  await mkdir(tmp, { recursive: true });

  console.error("Clipboard mode");
  console.error("  Copy an image, then press Enter to capture it.");
  console.error('  Type "done" or Ctrl+D when finished. Ctrl+C cancels.');

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  let count = 0;

  try {
    for await (const line of rl) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed === "done" || trimmed === "stop" || trimmed === "q") {
        break;
      }
      const dest = join(tmp, `clip-${Date.now()}.png`);
      try {
        const ok = await saveClipboardImage(dest);
        if (!ok) {
          console.error("  (no image on clipboard)");
          continue;
        }
        const staged = await stageFile(session, dest);
        const name = staged.split(/[/\\]/).pop()!;
        count += 1;
        onCaptured?.(name);
        console.error(`  + ${name}`);
      } catch (err) {
        console.error(`  ! ${err instanceof Error ? err.message : err}`);
      } finally {
        await rm(dest, { force: true }).catch(() => undefined);
      }
    }
  } finally {
    rl.close();
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }

  return count;
}
