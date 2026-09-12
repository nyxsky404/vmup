#!/usr/bin/env node
import { Command } from "commander";
import { runUpload } from "./pipeline.js";
import { runInit } from "./init.js";
import { runCheck } from "./check.js";
import {
  loadConfig,
  resolveTarget,
  assertTargetConnectable,
  configPath,
} from "./config.js";
import { pruneLocalOrphans } from "./stage.js";
import {
  pruneRemote,
  installRemoteSweeper,
  removeRemoteBatch,
  assertBatchId,
  preflight,
} from "./transport/ssh.js";
import { EXIT, PACKAGE_VERSION } from "./constants.js";
import { beginUpdateCheck, printUpdateNotice } from "./update-check.js";

const pendingUpdate = beginUpdateCheck();

async function done(code: number, json = false): Promise<never> {
  await printUpdateNotice(pendingUpdate, json);
  process.exit(code);
}

const program = new Command();

program
  .name("vmup")
  .description("Batch files to a remote host for coding agents")
  .version(PACKAGE_VERSION)
  .enablePositionalOptions();

program
  .command("init")
  .description("Create or update config; optional remote cleanup")
  .option("-y, --yes", "Non-interactive (requires VMUP_HOST)")
  .option("--no-sweeper", "Skip remote sweeper install in -y mode")
  .action(async (opts) => {
    const code = await runInit({
      yes: !!opts.yes,
      installSweeper: opts.sweeper !== false,
    });
    await done(code);
  });

program
  .command("check")
  .description("Test SSH using saved config")
  .option("-p, --profile <name>", "Use saved remote (default if omitted)")
  .option("--ssh-host <alias>", "Use a Host from ~/.ssh/config")
  .option("--sweeper", "Install/refresh remote cleanup sweeper")
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    const code = await runCheck({
      profile: opts.profile,
      sshHost: opts.sshHost,
      sweeper: !!opts.sweeper,
      json: !!opts.json,
    });
    await done(code, !!opts.json);
  });

program
  .command("profiles")
  .description("List saved profiles")
  .action(async () => {
    const cfg = await loadConfig();
    console.log(`Config: ${configPath()}`);
    console.log(`Default: ${cfg.default_profile ?? "default"}`);
    const profiles = cfg.profiles ?? {};
    for (const [name, p] of Object.entries(profiles)) {
      if (p.ssh_host) {
        console.log(`  ${name}: ssh_host=${p.ssh_host} remote=${p.remote_dir ?? cfg.remote_dir ?? "~/vmup"}`);
      } else {
        console.log(
          `  ${name}: ${p.user ?? "?"}@${p.host ?? "(no host)"} remote=${p.remote_dir ?? cfg.remote_dir ?? "~/vmup"}`,
        );
      }
    }
    await done(EXIT.OK);
  });

program
  .command("prune")
  .description("Delete expired remote batches (or all with --all)")
  .option("-p, --profile <name>", "Use saved remote (default if omitted)")
  .option("--ssh-host <alias>", "Use a Host from ~/.ssh/config")
  .option("--local", "Also prune local staging orphans")
  .option("--id <batchId>", "Delete a specific remote batch id")
  .option("--all", "Delete all remote batches, ignoring TTL")
  .option("--install-sweeper", "Install/refresh remote cleanup cron")
  .option("--ttl <minutes>", "Age cutoff in minutes (default 5)", (v) => Number(v))
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    try {
      if (opts.all && opts.id) {
        console.error("Use either --all or --id, not both");
        await done(EXIT.USAGE, !!opts.json);
      }
      if (opts.local) {
        const n = await pruneLocalOrphans(24);
        console.error(`Removed ${n} local orphan batch(es)`);
      }
      const cfg = await loadConfig();
      const target = resolveTarget(cfg, {
        profile: opts.profile,
        sshHost: opts.sshHost,
        ttlMinutes: opts.ttl,
      });
      assertTargetConnectable(target);
      await preflight(target);

      if (opts.installSweeper) {
        await installRemoteSweeper(target, target.ttlMinutes);
        console.error("Remote sweeper installed");
      }
      if (opts.id) {
        assertBatchId(opts.id);
        await removeRemoteBatch(target, opts.id);
        console.error(`Removed ${opts.id}`);
      } else {
        const n = await pruneRemote(target, target.ttlMinutes, { all: !!opts.all });
        console.error(`Pruned ${n} remote batch(es)`);
      }
      await done(EXIT.OK, !!opts.json);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      await done(EXIT.SSH, !!opts.json);
    }
  });

program
  .command("watch")
  .description("Watch a folder and upload a batch when you stop")
  .option("-p, --profile <name>", "Use saved remote (default if omitted)")
  .option("--ssh-host <alias>", "Use a Host from ~/.ssh/config")
  .option("--dir <path>", "Folder to watch")
  .option("--video", "Also collect videos in images-only mode")
  .option("--force", "Allow extra file types in images-only mode")
  .option("--keep-local", "Keep local staging after a successful upload")
  .option("--ttl <minutes>", "Remote batch lifetime in minutes (default 5)", (v) => Number(v))
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    const code = await runUpload({
      profile: opts.profile,
      sshHost: opts.sshHost,
      watchDir: opts.dir,
      includeVideo: !!opts.video,
      force: !!opts.force,
      keepLocal: !!opts.keepLocal,
      ttlMinutes: opts.ttl,
      json: !!opts.json,
      watch: true,
    });
    await done(code, !!opts.json);
  });

program
  .argument("[files...]", "Files to upload; omit to open a picker")
  .option("-p, --profile <name>", "Use saved remote (default if omitted)")
  .option("--ssh-host <alias>", "Use a Host from ~/.ssh/config")
  .option("--clip", "Capture clipboard files until you type done")
  .option("--watch", "Watch a folder, then upload (same as vmup watch)")
  .option("--dir <path>", "Folder to watch (with --watch)")
  .option("--video", "Also collect videos in images-only mode")
  .option("--force", "Allow extra file types in images-only mode")
  .option("--keep-local", "Keep local staging after a successful upload")
  .option("--ttl <minutes>", "Remote batch lifetime in minutes (default 5)", (v) => Number(v))
  .option("--json", "Print machine-readable JSON")
  .action(async (files: string[], opts) => {
    const code = await runUpload({
      files,
      profile: opts.profile,
      sshHost: opts.sshHost,
      clip: !!opts.clip,
      includeVideo: !!opts.video,
      force: !!opts.force,
      keepLocal: !!opts.keepLocal,
      ttlMinutes: opts.ttl,
      json: !!opts.json,
      watch: !!opts.watch,
      watchDir: opts.dir,
    });
    await done(code, !!opts.json);
  });

program.parseAsync(process.argv).catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await done(EXIT.USAGE);
});
