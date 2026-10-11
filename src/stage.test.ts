import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createBatchId,
  createStagingSession,
  destroyStaging,
  isBatchDirName,
  listStaged,
  stageFile,
} from "./stage.js";
import { resolveTarget, type VmupConfig } from "./config.js";
import { buildHumanOutput, clipboardPayload, emitSuccess } from "./output.js";
import { isImagePath, isVideoPath, validatePaths } from "./validate.js";
import { countBytes, formatBytes } from "./progress.js";
import { assertKeyUsable, formatSshError } from "./ssh-key.js";
import { fileSha256 } from "./hash.js";
import { isNewer, detectPackageManager, updateCommand } from "./update-check.js";
import {
  installRemoteSweeper,
  PARTIAL_STALE_MINUTES,
  remotePruneScript,
  remoteSweeperScript,
  remoteSweeperStatus,
  uploadBatch,
} from "./transport/ssh.js";
import { access, chmod, readFile, writeFile, mkdir, rm, utimes } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const execFile = promisify(execFileCallback);

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("batch id", () => {
  it("matches agents-date-time-uuid", () => {
    const id = createBatchId(new Date("2026-09-10T14:01:28"));
    assert.match(id, /^agents-20260910-140128-[0-9a-f-]{36}$/i);
    assert.equal(isBatchDirName(id), true);
  });

  it("rejects bad names", () => {
    assert.equal(isBatchDirName("codex-123"), false);
    assert.equal(isBatchDirName("agents-20260910-140128-abc"), false);
  });
});

describe("resolveTarget", () => {
  const cfg: VmupConfig = {
    default_profile: "default",
    remote_dir: "~/vmup",
    ttl_hours: 5,
    profiles: {
      default: {
        host: "1.2.3.4",
        user: "ubuntu",
        key: "~/.ssh/id_ed25519",
      },
      lab: { ssh_host: "lab", ttl_hours: 8 },
      short: { host: "5.6.7.8", ttl_minutes: 5 },
    },
  };

  it("resolves direct profile", () => {
    const t = resolveTarget(cfg, {});
    assert.equal(t.mode, "direct");
    assert.equal(t.host, "1.2.3.4");
    assert.equal(t.remoteDir, "~/vmup");
  });

  it("resolves ssh_host profile", () => {
    const t = resolveTarget(cfg, { profile: "lab" });
    assert.equal(t.mode, "ssh_host");
    assert.equal(t.sshHostAlias, "lab");
    assert.equal(t.ttlMinutes, 480);
  });

  it("one-shot --ssh-host", () => {
    const t = resolveTarget(cfg, { sshHost: "work" });
    assert.equal(t.mode, "ssh_host");
    assert.equal(t.sshHostAlias, "work");
    assert.equal(t.ttlMinutes, 300);
  });

  it("errors when both profile and ssh-host set", () => {
    assert.throws(() => resolveTarget(cfg, { profile: "default", sshHost: "lab" }));
  });

  it("migrates ttl_hours to minutes", () => {
    const t = resolveTarget(cfg, {});
    assert.equal(t.ttlMinutes, 300);
  });

  it("prefers ttl_minutes over ttl_hours", () => {
    const t = resolveTarget(cfg, { profile: "short" });
    assert.equal(t.ttlMinutes, 5);
  });

  it("--ttl minutes overrides profile", () => {
    const t = resolveTarget(cfg, { ttlMinutes: 7 });
    assert.equal(t.ttlMinutes, 7);
  });

  it("migrates legacy images prompt to files", () => {
    const t = resolveTarget(
      { ...cfg, prompt_template: "Please inspect all images in {{remote_path}}" },
      {},
    );
    assert.equal(t.promptTemplate, "Please inspect all files in {{remote_path}}");
  });

  it("clipboard_copy defaults to prompt", () => {
    const t = resolveTarget(cfg, {});
    assert.equal(t.clipboardCopy, "prompt");
  });

  it("clipboard_copy from config", () => {
    const t = resolveTarget({ ...cfg, clipboard_copy: "path" }, {});
    assert.equal(t.clipboardCopy, "path");
    const none = resolveTarget({ ...cfg, clipboard_copy: "none" }, {});
    assert.equal(none.clipboardCopy, "none");
  });

  it("invalid clipboard_copy falls back to prompt", () => {
    const t = resolveTarget({ ...cfg, clipboard_copy: "folder" }, {});
    assert.equal(t.clipboardCopy, "prompt");
  });

  it("VMUP_CLIPBOARD_COPY overrides config", () => {
    const prev = process.env.VMUP_CLIPBOARD_COPY;
    process.env.VMUP_CLIPBOARD_COPY = "none";
    try {
      const t = resolveTarget({ ...cfg, clipboard_copy: "path" }, {});
      assert.equal(t.clipboardCopy, "none");
    } finally {
      if (prev === undefined) delete process.env.VMUP_CLIPBOARD_COPY;
      else process.env.VMUP_CLIPBOARD_COPY = prev;
    }
  });
});

describe("clipboardPayload", () => {
  const path = "~/vmup/agents-1/";
  const prompt = "Please inspect all files in ~/vmup/agents-1/";

  it("copies the prompt by default mode", () => {
    assert.deepEqual(clipboardPayload("prompt", path, prompt), {
      text: prompt,
      label: "copied prompt to clipboard",
    });
  });

  it("copies the folder path", () => {
    assert.deepEqual(clipboardPayload("path", path, prompt), {
      text: path,
      label: "copied agent folder path to clipboard",
    });
  });

  it("copies nothing when none", () => {
    assert.equal(clipboardPayload("none", path, prompt), null);
  });

  it("keeps expiry details out of the copied prompt and path", () => {
    const output = buildHumanOutput({
      count: 1,
      profileName: "default",
      remotePath: path,
      expiresAt: "2026-10-11T17:05:00.000Z",
      ttlMinutes: 30,
      prompt,
      files: ["image-01.png"],
    });

    assert.match(output, /Expires:/);
    assert.match(output, /30-minute TTL/);
    assert.equal(clipboardPayload("prompt", path, prompt)?.text, prompt);
    assert.equal(clipboardPayload("path", path, prompt)?.text, path);
  });

  it("adds expiry metadata to JSON without changing the prompt", async () => {
    const target = resolveTarget(
      {
        default_profile: "default",
        profiles: {
          default: {
            host: "1.2.3.4",
            user: "ubuntu",
            key: "~/.ssh/id_ed25519",
          },
        },
      },
      { ttlMinutes: 30 },
    );
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      await emitSuccess({
        json: true,
        batchId: "agents-20261011-120000-00000000-0000-4000-8000-000000000000",
        target,
        remotePath: path,
        expiresAtEpochSeconds: 1_799_000_000,
        files: ["/tmp/image-01.png"],
        sweeperStatus: "outdated",
      });
    } finally {
      console.log = originalLog;
    }

    const result = JSON.parse(lines.join("\n"));
    assert.equal(result.expiresAt, "2027-01-03T18:13:20.000Z");
    assert.equal(result.prompt, prompt);
    assert.equal(result.sweeper, true);
    assert.equal(result.sweeperStatus, "outdated");
  });
});

describe("validatePaths", () => {
  it("accepts images and skips others", async () => {
    const dir = join(tmpdir(), `vmup-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const img = join(dir, "a.png");
    const txt = join(dir, "b.txt");
    await writeFile(img, "x");
    await writeFile(txt, "y");
    const res = await validatePaths([img, txt], { includeVideo: false, acceptAll: false });
    assert.deepEqual(res.accepted, [img]);
    assert.equal(res.skipped.length, 1);
    await rm(dir, { recursive: true, force: true });
  });

  it("accepts all types when acceptAll", async () => {
    const dir = join(tmpdir(), `vmup-all-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const pdf = join(dir, "a.pdf");
    await writeFile(pdf, "pdf");
    const res = await validatePaths([pdf], { acceptAll: true });
    assert.deepEqual(res.accepted, [pdf]);
    await rm(dir, { recursive: true, force: true });
  });

  it("detects media extensions", () => {
    assert.equal(isImagePath("x.PNG"), true);
    assert.equal(isVideoPath("y.mov"), true);
  });
});

describe("stageFile kind names", () => {
  it("renames to image-NN / video-NN / file-NN", async () => {
    const prevCache = process.env.VMUP_CACHE_DIR;
    const cache = join(tmpdir(), `vmup-stage-${Date.now()}`);
    process.env.VMUP_CACHE_DIR = cache;
    const srcDir = join(tmpdir(), `vmup-src-${Date.now()}`);
    await mkdir(srcDir, { recursive: true });
    const a = join(srcDir, "Screenshot 1.PNG");
    const b = join(srcDir, "clip.mov");
    const c = join(srcDir, "notes.pdf");
    await writeFile(a, "img");
    await writeFile(b, "vid");
    await writeFile(c, "pdf");
    const session = await createStagingSession();
    try {
      await stageFile(session, a);
      await stageFile(session, b);
      await stageFile(session, c);
      const staged = await listStaged(session);
      const names = staged.map((p) => p.split(/[/\\]/).pop());
      assert.deepEqual(names, ["image-01.png", "video-01.mov", "file-01.pdf"]);
    } finally {
      await destroyStaging(session);
      await rm(srcDir, { recursive: true, force: true });
      await rm(cache, { recursive: true, force: true });
      if (prevCache === undefined) delete process.env.VMUP_CACHE_DIR;
      else process.env.VMUP_CACHE_DIR = prevCache;
    }
  });
});

describe("ssh key checks", () => {
  it("rejects missing keys", async () => {
    await assert.rejects(
      () => assertKeyUsable(join(tmpdir(), "no-such-vmup-key")),
      /SSH key not found/,
    );
  });

  it("rejects group/world-readable keys", async () => {
    const path = join(tmpdir(), `vmup-key-${Date.now()}`);
    await writeFile(path, "dummy-key\n", { mode: 0o644 });
    await chmod(path, 0o644);
    try {
      await assert.rejects(() => assertKeyUsable(path), /too open/);
    } finally {
      await rm(path, { force: true });
    }
  });

  it("accepts 600 keys", async () => {
    const path = join(tmpdir(), `vmup-key-ok-${Date.now()}`);
    await writeFile(path, "dummy-key\n", { mode: 0o600 });
    await chmod(path, 0o600);
    try {
      await assertKeyUsable(path);
    } finally {
      await rm(path, { force: true });
    }
  });

  it("hints chmod on unprotected key errors", () => {
    const msg = formatSshError("UNPROTECTED PRIVATE KEY FILE!");
    assert.match(msg, /chmod 600/);
  });
});

describe("fileSha256", () => {
  it("hashes identical content the same", async () => {
    const dir = join(tmpdir(), `vmup-hash-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const a = join(dir, "a.bin");
    const b = join(dir, "b.bin");
    await writeFile(a, "same");
    await writeFile(b, "same");
    try {
      assert.equal(await fileSha256(a), await fileSha256(b));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("remotePruneScript", () => {
  it("age prune supports per-batch markers and stale partials", () => {
    const s = remotePruneScript("~/vmup", { ttlMinutes: 5 });
    assert.match(s, /-mmin \+5/);
    assert.match(s, /\.expires/);
    assert.match(s, /\*\.partial/);
    assert.match(s, /agents-\*/);
  });

  it("--all deletes every agents-* dir with no age filter", () => {
    const s = remotePruneScript("~/vmup", { ttlMinutes: 5, all: true });
    assert.equal(s.includes("-mmin"), false);
    assert.match(s, /agents-\*/);
    assert.match(s, /rm -rf "\$d"/);
  });

  it("--all removes expiry sidecars with the batches", async () => {
    const dir = join(tmpdir(), `vmup-prune-all-${Date.now()}`);
    const batchId = "agents-20261011-115959-00000000-0000-4000-8000-000000000009";
    const batch = join(dir, batchId);
    const marker = join(dir, `.${batchId}.expires`);
    await mkdir(batch, { recursive: true });
    await writeFile(marker, String(Math.floor(Date.now() / 1000) + 3600));

    try {
      const { stdout } = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5, all: true }),
      ]);
      assert.equal(stdout.trim(), "1");
      assert.equal(await pathExists(batch), false);
      assert.equal(await pathExists(marker), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps an old batch whose per-batch expiry is still in the future", async () => {
    const dir = join(tmpdir(), `vmup-prune-future-${Date.now()}`);
    const batchId = "agents-20261011-120000-00000000-0000-4000-8000-000000000000";
    const batch = join(dir, batchId);
    const marker = join(dir, `.${batchId}.expires`);
    await mkdir(batch, { recursive: true });
    await writeFile(marker, String(Math.floor(Date.now() / 1000) + 3600));
    const old = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(batch, old, old);

    try {
      const { stdout } = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(stdout.trim(), "0");
      assert.equal(await pathExists(batch), true);
      assert.equal(await pathExists(marker), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("deletes an expired fresh batch and its marker", async () => {
    const dir = join(tmpdir(), `vmup-prune-expired-${Date.now()}`);
    const batchId = "agents-20261011-120001-00000000-0000-4000-8000-000000000001";
    const batch = join(dir, batchId);
    const marker = join(dir, `.${batchId}.expires`);
    await mkdir(batch, { recursive: true });
    await writeFile(marker, String(Math.floor(Date.now() / 1000) - 1));

    try {
      const { stdout } = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(stdout.trim(), "1");
      assert.equal(await pathExists(batch), false);
      assert.equal(await pathExists(marker), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses a 15-minute stale threshold for partial uploads", async () => {
    const dir = join(tmpdir(), `vmup-prune-partial-${Date.now()}`);
    const partial = join(
      dir,
      "agents-20261011-120005-00000000-0000-4000-8000-000000000005.partial",
    );
    await mkdir(partial, { recursive: true });
    const active = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(partial, active, active);

    try {
      const first = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(first.stdout.trim(), "0");
      assert.equal(await pathExists(partial), true);

      const stale = new Date(
        Date.now() - (PARTIAL_STALE_MINUTES + 1) * 60 * 1000,
      );
      await utimes(partial, stale, stale);
      const second = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(second.stdout.trim(), "1");
      assert.equal(await pathExists(partial), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to age cleanup for an overflowing expiry marker", async () => {
    const dir = join(tmpdir(), `vmup-prune-overflow-${Date.now()}`);
    const batchId = "agents-20261011-120006-00000000-0000-4000-8000-000000000006";
    const batch = join(dir, batchId);
    const marker = join(dir, `.${batchId}.expires`);
    await mkdir(batch, { recursive: true });
    await writeFile(marker, "9".repeat(30));
    const old = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(batch, old, old);

    try {
      const { stdout } = await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(stdout.trim(), "1");
      assert.equal(await pathExists(batch), false);
      assert.equal(await pathExists(marker), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps a published marker while its partial directory still exists", async () => {
    const dir = join(tmpdir(), `vmup-prune-finalize-${Date.now()}`);
    const batchId = "agents-20261011-120007-00000000-0000-4000-8000-000000000007";
    const partial = join(dir, `${batchId}.partial`);
    const marker = join(dir, `.${batchId}.expires`);
    await mkdir(partial, { recursive: true });
    await writeFile(marker, String(Math.floor(Date.now() / 1000) + 3600));

    try {
      await execFile("bash", [
        "-c",
        remotePruneScript(dir, { ttlMinutes: 5 }),
      ]);
      assert.equal(await pathExists(partial), true);
      assert.equal(await pathExists(marker), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("remoteSweeperScript", () => {
  it("includes a version marker for stale-install detection", () => {
    assert.match(remoteSweeperScript("~/vmup", 5), /vmup-sweeper-version: 2/);
  });

  it("uses independent expiries and falls back to age for legacy batches", async () => {
    const dir = join(tmpdir(), `vmup-sweeper-${Date.now()}`);
    const futureId = "agents-20261011-120002-00000000-0000-4000-8000-000000000002";
    const expiredId = "agents-20261011-120003-00000000-0000-4000-8000-000000000003";
    const legacyId = "agents-20261011-120004-00000000-0000-4000-8000-000000000004";
    const future = join(dir, futureId);
    const expired = join(dir, expiredId);
    const legacy = join(dir, legacyId);
    await mkdir(future, { recursive: true });
    await mkdir(expired, { recursive: true });
    await mkdir(legacy, { recursive: true });
    await writeFile(
      join(dir, `.${futureId}.expires`),
      String(Math.floor(Date.now() / 1000) + 3600),
    );
    await writeFile(
      join(dir, `.${expiredId}.expires`),
      String(Math.floor(Date.now() / 1000) - 1),
    );
    const old = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(future, old, old);
    await utimes(legacy, old, old);

    try {
      await execFile("bash", ["-c", remoteSweeperScript(dir, 5)]);
      assert.equal(await pathExists(future), true);
      assert.equal(await pathExists(expired), false);
      assert.equal(await pathExists(legacy), false);
      assert.equal(await pathExists(join(dir, `.${futureId}.expires`)), true);
      assert.equal(await pathExists(join(dir, `.${expiredId}.expires`)), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("remote transport TTL integration", () => {
  it("publishes expiry metadata and verifies the cron-backed sweeper", async () => {
    const root = join(tmpdir(), `vmup transport $literal ${Date.now()}`);
    const fakeBin = join(root, "bin");
    const remoteDir = join(root, "remote root");
    const cronState = join(root, "crontab.txt");
    const source = join(root, "source.txt");
    const fakeSsh = join(fakeBin, "ssh");
    const fakeCrontab = join(fakeBin, "crontab");
    await mkdir(fakeBin, { recursive: true });
    await writeFile(source, "hello");
    await writeFile(
      fakeSsh,
      '#!/bin/sh\nshift\nexec /bin/sh -c "$1"\n',
    );
    await writeFile(
      fakeCrontab,
      [
        "#!/bin/sh",
        'if [ "$1" = "-l" ]; then',
        '  [ -f "$VMUP_TEST_CRONTAB" ] || exit 1',
        '  cat "$VMUP_TEST_CRONTAB"',
        "else",
        '  cat > "$VMUP_TEST_CRONTAB"',
        "fi",
        "",
      ].join("\n"),
    );
    await chmod(fakeSsh, 0o755);
    await chmod(fakeCrontab, 0o755);

    const target = resolveTarget(
      {
        default_profile: "default",
        profiles: {
          default: {
            ssh_host: "fake",
            remote_dir: remoteDir,
            ttl_minutes: 30,
          },
        },
      },
      {},
    );
    const batchId = "agents-20261011-120008-00000000-0000-4000-8000-000000000008";
    const oldPath = process.env.PATH;
    const oldCronState = process.env.VMUP_TEST_CRONTAB;
    process.env.PATH = `${fakeBin}:${oldPath ?? ""}`;
    process.env.VMUP_TEST_CRONTAB = cronState;

    try {
      await installRemoteSweeper(target, 5);
      assert.equal(await remoteSweeperStatus(target), "current");
      const cron = await readFile(cronState, "utf8");
      assert.match(cron, /'[^']*remote root\/\.cleanup\.sh'/);

      const uploaded = await uploadBatch({
        target,
        batchId,
        files: [source],
        ttlMinutes: 30,
      });
      assert.equal(uploaded.remotePath, join(remoteDir, batchId));
      assert.equal(await readFile(join(remoteDir, batchId, "source.txt"), "utf8"), "hello");
      const marker = Number(
        (await readFile(join(remoteDir, `.${batchId}.expires`), "utf8")).trim(),
      );
      assert.equal(marker, uploaded.expiresAtEpochSeconds);
      assert.ok(marker > Math.floor(Date.now() / 1000));

      await writeFile(cronState, "");
      assert.equal(await remoteSweeperStatus(target), "outdated");
    } finally {
      if (oldPath === undefined) delete process.env.PATH;
      else process.env.PATH = oldPath;
      if (oldCronState === undefined) delete process.env.VMUP_TEST_CRONTAB;
      else process.env.VMUP_TEST_CRONTAB = oldCronState;
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2.0 KB");
    assert.equal(formatBytes(2 * 1024 * 1024), "2.0 MB");
  });
});

describe("countBytes", () => {
  it("reports cumulative bytes as chunks pass through", async () => {
    const seen: number[] = [];
    const sink = new PassThrough();
    sink.resume();
    await pipeline(
      Readable.from([Buffer.from("ab"), Buffer.from("cd")]),
      countBytes((n) => seen.push(n)),
      sink,
    );
    assert.deepEqual(seen, [2, 4]);
  });
});

describe("isNewer", () => {
  it("compares semver-ish versions", () => {
    assert.equal(isNewer("0.2.1", "0.2.0"), true);
    assert.equal(isNewer("0.2.0", "0.2.1"), false);
    assert.equal(isNewer("0.2.0", "0.2.0"), false);
    assert.equal(isNewer("1.0.0", "0.9.9"), true);
  });
});

describe("detectPackageManager", () => {
  it("detects pnpm, bun, yarn, npx, npm from install paths", () => {
    const env = {};
    assert.equal(
      detectPackageManager("/Users/x/Library/pnpm/global/5/node_modules/@nyxsky404/vmup/dist/cli.js", env),
      "pnpm",
    );
    assert.equal(
      detectPackageManager("/Users/x/.local/share/pnpm/global/5/.pnpm/@nyxsky404+vmup@0.3.0/node_modules/@nyxsky404/vmup/dist/cli.js", env),
      "pnpm",
    );
    assert.equal(
      detectPackageManager("/Users/x/.bun/install/global/node_modules/@nyxsky404/vmup/dist/cli.js", env),
      "bun",
    );
    assert.equal(
      detectPackageManager("/Users/x/.config/yarn/global/node_modules/@nyxsky404/vmup/dist/cli.js", env),
      "yarn",
    );
    assert.equal(
      detectPackageManager("/Users/x/.npm/_npx/123/@nyxsky404/vmup/dist/cli.js", env),
      "npx",
    );
    assert.equal(
      detectPackageManager("/usr/local/lib/node_modules/@nyxsky404/vmup/dist/cli.js", env),
      "npm",
    );
  });

  it("maps each manager to an update command", () => {
    assert.equal(updateCommand("pnpm"), "pnpm add -g @nyxsky404/vmup");
    assert.equal(updateCommand("bun"), "bun install -g @nyxsky404/vmup");
    assert.equal(updateCommand("yarn"), "yarn global add @nyxsky404/vmup");
    assert.equal(updateCommand("npx"), "npx @nyxsky404/vmup@latest");
    assert.equal(updateCommand("npm"), "npm i -g @nyxsky404/vmup");
  });
});
