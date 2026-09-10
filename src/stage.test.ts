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
import { isImagePath, isVideoPath, validatePaths } from "./validate.js";
import { formatBytes } from "./progress.js";
import { assertKeyUsable, formatSshError } from "./ssh-key.js";
import { fileSha256 } from "./hash.js";
import { isNewer, detectPackageManager, updateCommand } from "./update-check.js";
import { chmod, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

describe("formatBytes", () => {
  it("formats sizes", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2.0 KB");
    assert.equal(formatBytes(2 * 1024 * 1024), "2.0 MB");
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
