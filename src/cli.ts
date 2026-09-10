#!/usr/bin/env node
import { Command } from "commander";
import { runUpload } from "./pipeline.js";
import { runInit } from "./init.js";
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
import { EXIT } from "./constants.js";

const program = new Command();

program
  .name("vmup")
  .description("Batch media to a remote host for coding agents")
  .version("0.1.0");

program
  .command("init")
  .description("Create config and optionally install remote cleanup")
  .option("-y, --yes", "Non-interactive (requires VMUP_HOST)")
  .option("--no-sweeper", "Skip remote sweeper install in -y mode")
  .action(async (opts) => {
    const code = await runInit({
      yes: !!opts.yes,
      installSweeper: opts.sweeper !== false,
    });
    process.exit(code);
  });

program
  .command("profiles")
  .description("List configured profiles")
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
  });

program
  .command("prune")
  .description("Prune expired remote batches (and optional local cache)")
  .option("-p, --profile <name>", "Profile name")
  .option("--ssh-host <alias>", "SSH config alias")
  .option("--local", "Also prune local staging orphans")
  .option("--id <batchId>", "Delete a specific remote batch id")
  .option("--install-sweeper", "Install/refresh remote cleanup cron")
  .option("--json", "JSON output")
  .action(async (opts) => {
    try {
      if (opts.local) {
        const n = await pruneLocalOrphans(24);
        console.error(`Removed ${n} local orphan batch(es)`);
      }
      const cfg = await loadConfig();
      const target = resolveTarget(cfg, {
        profile: opts.profile,
        sshHost: opts.sshHost,
      });
      assertTargetConnectable(target);
      await preflight(target);

      if (opts.installSweeper) {
        await installRemoteSweeper(target, target.ttlHours);
        console.error("Remote sweeper installed");
      }
      if (opts.id) {
        assertBatchId(opts.id);
        await removeRemoteBatch(target, opts.id);
        console.error(`Removed ${opts.id}`);
      } else {
        const n = await pruneRemote(target, target.ttlHours);
        console.error(`Pruned ${n} remote batch(es)`);
      }
      process.exit(EXIT.OK);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(EXIT.SSH);
    }
  });

program
  .command("watch")
  .description("Watch screenshots folder and upload a batch when you stop")
  .option("-p, --profile <name>", "Profile name")
  .option("--ssh-host <alias>", "SSH config alias")
  .option("--dir <path>", "Folder to watch")
  .option("--video", "Include screen recordings")
  .option("--force", "Allow non-media with --force semantics")
  .option("--keep-local", "Keep local staging after success")
  .option("--ttl <hours>", "TTL override", (v) => Number(v))
  .option("--json", "JSON output")
  .action(async (opts) => {
    const code = await runUpload({
      profile: opts.profile,
      sshHost: opts.sshHost,
      watchDir: opts.dir,
      includeVideo: !!opts.video,
      force: !!opts.force,
      keepLocal: !!opts.keepLocal,
      ttlHours: opts.ttl,
      json: !!opts.json,
      watch: true,
    });
    process.exit(code);
  });

program
  .argument("[files...]", "Files or directories to upload")
  .option("-p, --profile <name>", "Profile name")
  .option("--ssh-host <alias>", "SSH config alias")
  .option("--clip", "Clipboard capture loop")
  .option("--video", "Include videos when collecting")
  .option("--force", "Allow non-media files")
  .option("--keep-local", "Keep local staging after success")
  .option("--ttl <hours>", "TTL override", (v) => Number(v))
  .option("--json", "JSON output")
  .action(async (files: string[], opts) => {
    // If user ran a subcommand, commander won't hit this with subcommand name as file
    const code = await runUpload({
      files,
      profile: opts.profile,
      sshHost: opts.sshHost,
      clip: !!opts.clip,
      includeVideo: !!opts.video,
      force: !!opts.force,
      keepLocal: !!opts.keepLocal,
      ttlHours: opts.ttl,
      json: !!opts.json,
    });
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(EXIT.USAGE);
});
