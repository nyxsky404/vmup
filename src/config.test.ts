import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { configPath, loadConfig, resolveTarget, saveConfig, type VmupConfig } from "./config.js";

const execFile = promisify(execFileCallback);

describe("TOML configuration on disk", () => {
  let directory: string;
  let previousEnv: Record<string, string>;

  beforeEach(async () => {
    previousEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("VMUP_") && value !== undefined) {
        previousEnv[key] = value;
        delete process.env[key];
      }
    }
    directory = await mkdtemp(join(tmpdir(), "vmup-config-test-"));
    process.env.VMUP_CONFIG_DIR = directory;
    process.env.VMUP_CACHE_DIR = join(directory, "cache");
    process.env.VMUP_NO_UPDATE_CHECK = "1";
  });

  afterEach(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("VMUP_")) delete process.env[key];
    }
    Object.assign(process.env, previousEnv);
    await rm(directory, { recursive: true, force: true });
  });

  it("round-trips quoted profile names, Unicode, escapes, numbers, and booleans", async () => {
    const config: VmupConfig = {
      default_profile: 'lab."東京"',
      prompt_template: 'Inspect "{{remote_path}}"\nKeep \\ paths',
      remote_dir: "/tmp/agent's files/東京",
      ttl_minutes: 7,
      accept_all_files: false,
      max_file_mb: 1.25,
      clip_dedup: false,
      clipboard_copy: "none",
      profiles: { 'lab."東京"': { ssh_host: "lab-vm", port: 2222, ttl_minutes: 9 } },
    };
    await saveConfig(config);
    const loaded = await loadConfig();
    assert.deepEqual(JSON.parse(JSON.stringify(loaded)), config);
    const target = resolveTarget(loaded);
    assert.equal(target.sshHostAlias, "lab-vm");
    assert.equal(target.remoteDir, config.remote_dir);
    assert.equal(target.promptTemplate, config.prompt_template);
    assert.equal(target.ttlMinutes, 9);
    assert.equal(target.maxFileMb, 1.25);
    assert.equal(target.acceptAllFiles, false);
  });

  it("loads hand-written TOML with comments, literal strings, and exponents", async () => {
    await writeFile(configPath(), `
default_profile = "lab.vm" # a quoted table key follows
remote_dir = '/tmp/agent files'
ttl_minutes = 5e1
max_file_mb = 1_024.5
watch_include_video = true
[profiles."lab.vm"]
ssh_host = 'lab-vm'
ttl_hours = 2
`);
    const target = resolveTarget(await loadConfig());
    assert.equal(target.sshHostAlias, "lab-vm");
    assert.equal(target.remoteDir, "/tmp/agent files");
    assert.equal(target.ttlMinutes, 120);
    assert.equal(target.maxFileMb, 1024.5);
    assert.equal(target.watchIncludeVideo, true);
  });

  it("returns an empty configuration when the file does not exist", async () => {
    assert.deepEqual(await loadConfig(), {});
  });

  for (const [name, contents] of [
    ["an incomplete exponent", "ttl_minutes = 1e+"],
    ["a missing exponent", "ttl_minutes = 1e"],
    ["an unterminated string", 'remote_dir = "broken'],
    ["a duplicate key", "ttl_minutes = 5\nttl_minutes = 10"],
  ]) {
    it(`does not apply partial configuration from ${name}`, async () => {
      await writeFile(configPath(), `default_profile = "unsafe"\n${contents}\n`);
      assert.deepEqual(await loadConfig(), {});
    });
  }

  it("writes non-interactive init configuration that a separate CLI process can read", async () => {
    const cli = fileURLToPath(new URL("./cli.js", import.meta.url));
    const env = {
      ...process.env,
      VMUP_HOST: "127.0.0.1",
      VMUP_USER: "test-user",
      VMUP_KEY: join(directory, "key with spaces"),
      VMUP_PROFILE: "lab.vm",
      VMUP_REMOTE_DIR: "/tmp/agent's files",
      VMUP_TTL_MINUTES: "17",
    };
    const initialized = await execFile(process.execPath, [cli, "init", "--yes", "--no-sweeper"], { env });
    assert.match(initialized.stdout, /Wrote/);
    assert.doesNotMatch(await readFile(configPath(), "utf8"), /ttl_hours/);
    const loaded = await loadConfig();
    assert.equal(loaded.profiles?.["lab.vm"]?.key, env.VMUP_KEY);
    assert.equal(resolveTarget(loaded).ttlMinutes, 17);
    const profiles = await execFile(process.execPath, [cli, "profiles"], { env: process.env });
    assert.match(profiles.stdout, /Default: lab\.vm/);
    assert.match(profiles.stdout, /test-user@127\.0\.0\.1/);
    assert.match(profiles.stdout, /agent's files/);
  });
});
