import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBatchId, isBatchDirName } from "./stage.js";
import { resolveTarget, type VmupConfig } from "./config.js";
import { isImagePath, isVideoPath, validatePaths } from "./validate.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
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
    assert.equal(t.ttlHours, 8);
  });

  it("one-shot --ssh-host", () => {
    const t = resolveTarget(cfg, { sshHost: "work" });
    assert.equal(t.mode, "ssh_host");
    assert.equal(t.sshHostAlias, "work");
    assert.equal(t.ttlHours, 5);
  });

  it("errors when both profile and ssh-host set", () => {
    assert.throws(() => resolveTarget(cfg, { profile: "default", sshHost: "lab" }));
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
    const res = await validatePaths([img, txt], { includeVideo: false });
    assert.deepEqual(res.accepted, [img]);
    assert.equal(res.skipped.length, 1);
    await rm(dir, { recursive: true, force: true });
  });

  it("detects media extensions", () => {
    assert.equal(isImagePath("x.PNG"), true);
    assert.equal(isVideoPath("y.mov"), true);
  });
});
