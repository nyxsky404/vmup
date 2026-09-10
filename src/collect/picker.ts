import { spawn } from "node:child_process";
import { platform } from "node:os";

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

/** Native multi-select file picker. Returns absolute paths. */
export async function collectFromPicker(): Promise<string[]> {
  const plat = platform();
  if (plat === "darwin") return macPicker();
  if (plat === "linux") return linuxPicker();
  throw new Error(
    "File picker is not supported on this platform. Pass file paths or use WSL.",
  );
}

async function macPicker(): Promise<string[]> {
  const script = `
set theFiles to choose file with prompt "Select media to upload with vmup" with multiple selections allowed
set out to ""
repeat with f in theFiles
  set out to out & POSIX path of f & linefeed
end repeat
return out
`;
  const res = await run("osascript", ["-e", script]);
  if (res.code !== 0) {
    if (/User canceled/i.test(res.stderr) || /User cancelled/i.test(res.stderr)) {
      return [];
    }
    throw new Error(res.stderr.trim() || "macOS file picker failed");
  }
  return res.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

async function linuxPicker(): Promise<string[]> {
  try {
    const res = await run("zenity", [
      "--file-selection",
      "--multiple",
      "--separator=\n",
      "--title=Select media to upload with vmup",
    ]);
    if (res.code !== 0) return [];
    return res.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    // zenity missing
  }

  try {
    const res = await run("kdialog", ["--getopenfilename", "."]);
    if (res.code !== 0) return [];
    const p = res.stdout.trim();
    return p ? [p] : [];
  } catch {
    throw new Error(
      "No GUI file picker found. Install zenity/kdialog, or pass file paths: vmup file1.png file2.png",
    );
  }
}
