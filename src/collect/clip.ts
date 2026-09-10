import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { platform } from "node:os";
import { basename, extname, join } from "node:path";
import { mkdir, rm, copyFile } from "node:fs/promises";
import type { StagingSession } from "../stage.js";
import { stageFile } from "../stage.js";
import { fileSha256 } from "../hash.js";
import { color } from "../color.js";

export type ClipOptions = {
  dedup: boolean;
};

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

async function macClipboardFiles(): Promise<string[]> {
  const script = `
try
  set theFile to the clipboard as «class furl»
  return POSIX path of theFile
on error
  return ""
end try
`;
  const res = await run("osascript", ["-e", script]);
  const p = res.stdout.trim();
  return p ? [p] : [];
}

async function linuxClipboardFiles(): Promise<string[]> {
  let raw = "";
  if (await commandExists("wl-paste")) {
    const res = await run("wl-paste", ["-t", "text/uri-list"]);
    if (res.code === 0) raw = res.stdout;
  }
  if (!raw && (await commandExists("xclip"))) {
    const res = await run("xclip", [
      "-selection",
      "clipboard",
      "-t",
      "text/uri-list",
      "-o",
    ]);
    if (res.code === 0) raw = res.stdout;
  }
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("file://"))
    .map((l) => decodeURIComponent(l.replace(/^file:\/\//, "")));
}

async function saveClipboardImage(destPng: string): Promise<boolean> {
  const plat = platform();
  if (plat === "darwin") {
    if (!(await commandExists("pngpaste"))) return false;
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
    return false;
  }
  return false;
}

type Capture =
  | { kind: "file"; path: string }
  | { kind: "image"; path: string }
  | { kind: "empty" };

async function captureClipboard(tmp: string): Promise<Capture> {
  const plat = platform();
  const files =
    plat === "darwin"
      ? await macClipboardFiles()
      : plat === "linux"
        ? await linuxClipboardFiles()
        : [];
  for (const p of files) {
    try {
      const dest = join(tmp, `src-${Date.now()}${extname(p)}`);
      await copyFile(p, dest);
      return { kind: "file", path: dest };
    } catch {
      // not a readable file
    }
  }

  const img = join(tmp, `clip-${Date.now()}.png`);
  const ok = await saveClipboardImage(img);
  if (ok) return { kind: "image", path: img };
  return { kind: "empty" };
}

/**
 * Interactive clipboard loop.
 * Enter = capture current clipboard file or image.
 * Type done/stop or Ctrl+D to finish. Ctrl+C cancels.
 */
export async function collectFromClipboard(
  session: StagingSession,
  opts: ClipOptions = { dedup: true },
): Promise<number> {
  const tmp = join(session.localDir, ".clip-tmp");
  await mkdir(tmp, { recursive: true });
  const seen = new Set<string>();
  let busy = false;

  console.error(color.bold("Clipboard mode"));
  console.error(color.dim("  Copy a file or image, then press Enter to capture."));
  console.error(color.dim('  Type "done" or Ctrl+D when finished. Ctrl+C cancels.'));
  if (opts.dedup) {
    console.error(color.dim("  Duplicate captures are skipped (clip_dedup = true)."));
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  let count = 0;
  let stopping = false;

  const captureOnce = async () => {
    if (busy || stopping) return;
    busy = true;
    const dests: string[] = [];
    try {
      const cap = await captureClipboard(tmp);
      if (cap.kind === "empty") {
        const hint =
          platform() === "darwin"
            ? "  (clipboard has no file or image — copy a file in Finder, or brew install pngpaste for screenshots)"
            : "  (clipboard has no file or image)";
        console.error(color.yellow(hint));
        return;
      }
      dests.push(cap.path);
      const hash = await fileSha256(cap.path);
      if (opts.dedup && seen.has(hash)) {
        console.error(
          color.yellow("  (same clipboard content already captured — copy a different file)"),
        );
        return;
      }
      const staged = await stageFile(session, cap.path);
      seen.add(hash);
      const name = basename(staged);
      count += 1;
      console.error(color.green(`  + ${name}`));
    } catch (err) {
      console.error(`  ! ${err instanceof Error ? err.message : err}`);
    } finally {
      for (const p of dests) await rm(p, { force: true }).catch(() => undefined);
      busy = false;
    }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        if (stopping) return;
        stopping = true;
        process.off("SIGINT", onSigInt);
        rl.close();
        resolve();
      };
      const onSigInt = () => {
        stopping = true;
        process.off("SIGINT", onSigInt);
        rl.close();
        reject(Object.assign(new Error("cancelled"), { code: 130 }));
      };
      process.on("SIGINT", onSigInt);

      rl.on("line", (line) => {
        const t = line.trim().toLowerCase();
        if (t === "done" || t === "stop" || t === "q") {
          finish();
          return;
        }
        void captureOnce();
      });

      rl.on("close", () => {
        finish();
      });
    });
  } finally {
    try {
      process.stdin.pause();
    } catch {
      // ignore
    }
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }

  if (count > 0) {
    console.error(color.dim(`Captured ${count} file${count === 1 ? "" : "s"}.`));
  }
  return count;
}
