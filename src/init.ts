import { createInterface } from "node:readline";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import {
  DEFAULT_PORT,
  DEFAULT_PROFILE,
  DEFAULT_REMOTE_DIR,
  DEFAULT_TTL_HOURS,
  DEFAULT_USER,
  configPath,
  defaultSshKeyHint,
  defaultWatchDir,
  expandHome,
} from "./constants.js";
import {
  emptyTemplateConfig,
  saveConfig,
  type VmupConfig,
  type ProfileConfig,
} from "./config.js";
import { preflight, installRemoteSweeper } from "./transport/ssh.js";
import { resolveTarget, assertTargetConnectable } from "./config.js";
import { assertKeyUsable } from "./ssh-key.js";

function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
  def?: string,
): Promise<string> {
  const hint = def != null && def !== "" ? ` [${def}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      const a = answer.trim();
      if (a === "" && def != null) resolve(def);
      else resolve(a);
    });
  });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(expandHome(p), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runInit(opts: {
  yes?: boolean;
  installSweeper?: boolean;
}): Promise<number> {
  const cfg = emptyTemplateConfig();
  const keyHint = (await fileExists(defaultSshKeyHint()))
    ? defaultSshKeyHint()
    : "~/.ssh/id_rsa";

  if (opts.yes) {
    // Non-interactive: require env for host
    const host = process.env.VMUP_HOST;
    if (!host) {
      console.error("Non-interactive init requires VMUP_HOST (and usually VMUP_USER / VMUP_KEY)");
      return 1;
    }
    cfg.profiles![DEFAULT_PROFILE] = {
      host,
      user: process.env.VMUP_USER ?? DEFAULT_USER,
      key: process.env.VMUP_KEY ?? keyHint,
      port: Number(process.env.VMUP_PORT ?? DEFAULT_PORT),
      remote_dir: process.env.VMUP_REMOTE_DIR ?? DEFAULT_REMOTE_DIR,
      ttl_hours: Number(process.env.VMUP_TTL_HOURS ?? DEFAULT_TTL_HOURS),
    };
    cfg.watch_dir = process.env.VMUP_WATCH_DIR ?? defaultWatchDir();
    await saveConfig(cfg);
    console.log(`Wrote ${configPath()}`);
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log("vmup init — press Enter to accept [defaults]\n");

      const profileName = await ask(rl, "Profile name", DEFAULT_PROFILE);
      const host = await ask(rl, "Host (required — Enter to skip)", "");
      const user = await ask(rl, "SSH user", DEFAULT_USER);
      const key = await ask(rl, "SSH key path", keyHint);
      const portStr = await ask(rl, "SSH port", String(DEFAULT_PORT));
      const remoteDir = await ask(rl, "Remote dir", DEFAULT_REMOTE_DIR);
      const ttlStr = await ask(rl, "TTL hours", String(DEFAULT_TTL_HOURS));
      const watchDir = await ask(rl, "Screenshots / watch folder", defaultWatchDir());
      const allAns = await ask(rl, "Accept all file types (pdf, video, …), not just images? (Y/n)", "Y");
      const sweeperAns = await ask(rl, "Install remote cleanup sweeper? (Y/n)", "Y");

      const profile: ProfileConfig = {
        user,
        key,
        port: Number(portStr) || DEFAULT_PORT,
        remote_dir: remoteDir,
        ttl_hours: Number(ttlStr) || DEFAULT_TTL_HOURS,
      };
      if (host) profile.host = host;

      cfg.default_profile = profileName || DEFAULT_PROFILE;
      cfg.remote_dir = remoteDir;
      cfg.ttl_hours = Number(ttlStr) || DEFAULT_TTL_HOURS;
      cfg.watch_dir = watchDir;
      cfg.accept_all_files = !/^n(o)?$/i.test(allAns);
      cfg.watch_include_video = cfg.accept_all_files;
      cfg.profiles = { [cfg.default_profile]: profile };

      await saveConfig(cfg);
      console.log(`\nWrote ${configPath()}`);

      if (key) {
        try {
          await assertKeyUsable(expandHome(key));
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
        }
      }

      if (host) {
        try {
          const target = resolveTarget(cfg, {});
          assertTargetConnectable(target);
          console.log("Testing SSH…");
          await preflight(target);
          console.log("SSH OK");
          if (!/^n(o)?$/i.test(sweeperAns)) {
            await installRemoteSweeper(target, target.ttlHours);
            console.log("Remote sweeper installed (every 10 minutes)");
          }
        } catch (err) {
          console.error(
            `SSH setup incomplete: ${err instanceof Error ? err.message : err}`,
          );
          console.error("Config is saved. Retry SSH with: vmup check");
          console.error("Install sweeper later with: vmup check --sweeper");
        }
      } else {
        console.log(
          "Host skipped — set it in config or env (VMUP_HOST) before uploading.",
        );
      }
    } finally {
      rl.close();
    }
  }

  if (opts.yes && opts.installSweeper !== false) {
    try {
      const target = resolveTarget(cfg, {});
      assertTargetConnectable(target);
      await preflight(target);
      await installRemoteSweeper(target, target.ttlHours);
      console.log("Remote sweeper installed");
    } catch (err) {
      console.error(
        `Could not install sweeper: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log("\nNext:");
  console.log("  vmup check         # retry SSH without re-asking questions");
  console.log("  vmup file1.png file2.pdf");
  console.log("  vmup               # file picker");
  console.log("  vmup --clip        # clipboard loop");
  console.log("  vmup watch         # watch folder (also: vmup --watch)");
  return 0;
}

export async function writeLocalDevConfig(profile: ProfileConfig): Promise<void> {
  const cfg: VmupConfig = emptyTemplateConfig();
  cfg.profiles![DEFAULT_PROFILE] = {
    ...cfg.profiles![DEFAULT_PROFILE],
    ...profile,
  };
  await saveConfig(cfg);
}
