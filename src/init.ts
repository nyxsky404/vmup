import { createInterface } from "node:readline";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import {
  DEFAULT_PORT,
  DEFAULT_PROFILE,
  DEFAULT_REMOTE_DIR,
  DEFAULT_TTL_MINUTES,
  DEFAULT_USER,
  configPath,
  defaultSshKeyHint,
  defaultWatchDir,
  expandHome,
} from "./constants.js";
import {
  clampTtlMinutes,
  configExists,
  emptyTemplateConfig,
  loadConfig,
  saveConfig,
  ttlMinutesFromFields,
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

async function askYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultYes: boolean,
): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const a = await ask(rl, `${question} (${hint})`, defaultYes ? "Y" : "N");
  if (defaultYes) return !/^n(o)?$/i.test(a);
  return /^y(es)?$/i.test(a);
}

function isOverwriteChoice(raw: string): boolean {
  return /^(o|overwrite|over)$/i.test(raw.trim());
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(expandHome(p), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function profileNames(cfg: VmupConfig): string[] {
  return Object.keys(cfg.profiles ?? {});
}

function formatProfileLine(name: string, p: ProfileConfig, isDefault: boolean): string {
  const mark = isDefault ? "  (default)" : "";
  if (p.ssh_host) return `  ${name}: ssh_host=${p.ssh_host}${mark}`;
  return `  ${name}: ${p.user ?? "?"}@${p.host ?? "(no host)"}${mark}`;
}

function ttlDefaultForProfile(p: ProfileConfig): number {
  return (
    ttlMinutesFromFields({ minutes: p.ttl_minutes, hours: p.ttl_hours }) ??
    DEFAULT_TTL_MINUTES
  );
}

async function askProfileFields(
  rl: ReturnType<typeof createInterface>,
  current: ProfileConfig,
  keyHint: string,
): Promise<ProfileConfig> {
  const host = await ask(rl, "Host (required — Enter to skip)", current.host ?? "");
  const user = await ask(rl, "SSH user", current.user ?? DEFAULT_USER);
  const key = await ask(rl, "SSH key path", current.key ?? keyHint);
  const portStr = await ask(rl, "SSH port", String(current.port ?? DEFAULT_PORT));
  const remoteDir = await ask(
    rl,
    "Remote dir",
    current.remote_dir ?? DEFAULT_REMOTE_DIR,
  );
  const ttlStr = await ask(rl, "TTL minutes", String(ttlDefaultForProfile(current)));

  const profile: ProfileConfig = {
    user,
    key,
    port: Number(portStr) || DEFAULT_PORT,
    remote_dir: remoteDir,
    ttl_minutes: clampTtlMinutes(Number(ttlStr) || DEFAULT_TTL_MINUTES),
  };
  if (host) profile.host = host;
  if (current.ssh_host && !host) profile.ssh_host = current.ssh_host;
  return profile;
}

async function tryRemoteSetup(
  cfg: VmupConfig,
  profileName: string,
  installSweeper: boolean,
): Promise<void> {
  const profile = cfg.profiles?.[profileName];
  if (profile?.key) {
    try {
      await assertKeyUsable(expandHome(profile.key));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
  }

  if (!profile?.host && !profile?.ssh_host) {
    console.log("Host skipped — set it in config or env (VMUP_HOST) before uploading.");
    return;
  }

  try {
    const target = resolveTarget(cfg, { profile: profileName });
    assertTargetConnectable(target);
    console.log("Testing SSH…");
    await preflight(target);
    console.log("SSH OK");
    if (installSweeper) {
      await installRemoteSweeper(target, target.ttlMinutes);
      console.log("Remote sweeper installed (every minute)");
    }
  } catch (err) {
    console.error(`SSH setup incomplete: ${err instanceof Error ? err.message : err}`);
    console.error("Config is saved. Retry SSH with: vmup check");
    console.error("Install sweeper later with: vmup check --sweeper");
  }
}

function printNext(): void {
  console.log("\nNext:");
  console.log("  vmup check         # retry SSH without re-asking questions");
  console.log("  vmup file1.png file2.pdf");
  console.log("  vmup               # file picker");
  console.log("  vmup --clip        # clipboard loop");
  console.log("  vmup watch         # watch folder (also: vmup --watch)");
}

async function runInitYes(
  cfg: VmupConfig,
  existed: boolean,
  installSweeper: boolean,
): Promise<number> {
  const host = process.env.VMUP_HOST;
  if (!host) {
    console.error("Non-interactive init requires VMUP_HOST (and usually VMUP_USER / VMUP_KEY)");
    return 1;
  }
  const keyHint = (await fileExists(defaultSshKeyHint()))
    ? defaultSshKeyHint()
    : "~/.ssh/id_rsa";
  const name =
    process.env.VMUP_PROFILE ?? cfg.default_profile ?? DEFAULT_PROFILE;
  const ttl =
    process.env.VMUP_TTL_MINUTES != null && process.env.VMUP_TTL_MINUTES !== ""
      ? clampTtlMinutes(Number(process.env.VMUP_TTL_MINUTES))
      : process.env.VMUP_TTL_HOURS
        ? clampTtlMinutes(Number(process.env.VMUP_TTL_HOURS) * 60)
        : DEFAULT_TTL_MINUTES;

  cfg.profiles = cfg.profiles ?? {};
  cfg.profiles[name] = {
    host,
    user: process.env.VMUP_USER ?? DEFAULT_USER,
    key: process.env.VMUP_KEY ?? keyHint,
    port: Number(process.env.VMUP_PORT ?? DEFAULT_PORT),
    remote_dir: process.env.VMUP_REMOTE_DIR ?? DEFAULT_REMOTE_DIR,
    ttl_minutes: ttl,
  };
  if (!existed) {
    cfg.default_profile = name;
    cfg.watch_dir = process.env.VMUP_WATCH_DIR ?? defaultWatchDir();
    cfg.ttl_minutes = ttl;
    cfg.remote_dir = process.env.VMUP_REMOTE_DIR ?? DEFAULT_REMOTE_DIR;
  }
  await saveConfig(cfg);
  console.log(`Wrote ${configPath()}`);

  if (installSweeper) {
    try {
      const target = resolveTarget(cfg, { profile: name });
      assertTargetConnectable(target);
      await preflight(target);
      await installRemoteSweeper(target, target.ttlMinutes);
      console.log("Remote sweeper installed");
    } catch (err) {
      console.error(
        `Could not install sweeper: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  printNext();
  return 0;
}

export async function runInit(opts: {
  yes?: boolean;
  installSweeper?: boolean;
}): Promise<number> {
  const existed = await configExists();
  const cfg: VmupConfig = existed ? await loadConfig() : emptyTemplateConfig();
  const names = profileNames(cfg);
  const hasProfiles = existed && names.length > 0;
  const keyHint = (await fileExists(defaultSshKeyHint()))
    ? defaultSshKeyHint()
    : "~/.ssh/id_rsa";

  if (opts.yes) {
    return runInitYes(cfg, existed, opts.installSweeper !== false);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("vmup init — press Enter to accept [current/default values]\n");

    let profileName: string;
    let isNew = true;
    let askMakeDefault = false;

    if (!hasProfiles) {
      profileName = (await ask(rl, "Profile name", DEFAULT_PROFILE)) || DEFAULT_PROFILE;
    } else {
      console.log(`Config: ${configPath()}`);
      const def = cfg.default_profile ?? DEFAULT_PROFILE;
      for (const name of names) {
        console.log(formatProfileLine(name, cfg.profiles![name]!, name === def));
      }
      console.log("");
      const modeRaw = await ask(
        rl,
        "Create a new profile, or overwrite an existing one?",
        "new",
      );
      const overwrite = isOverwriteChoice(modeRaw);

      if (overwrite) {
        isNew = false;
        if (names.length === 1) {
          profileName = names[0]!;
          console.log(`Overwriting profile "${profileName}"`);
        } else {
          console.log(`Profiles: ${names.join(", ")}`);
          profileName = await ask(rl, "Which profile to overwrite", def);
          if (!cfg.profiles?.[profileName]) {
            console.error(`Unknown profile "${profileName}".`);
            return 1;
          }
        }
      } else {
        let suggested = "";
        while (true) {
          profileName =
            (await ask(rl, "Profile name", suggested || undefined)) || "";
          if (!profileName) {
            console.log("Profile name is required.");
            continue;
          }
          if (!cfg.profiles?.[profileName]) break;
          const choice = await ask(
            rl,
            `Profile "${profileName}" already exists. Overwrite it, or pick a different name?`,
            "rename",
          );
          if (isOverwriteChoice(choice)) {
            isNew = false;
            break;
          }
          suggested = "";
        }
        askMakeDefault = isNew;
      }
    }

    const current = cfg.profiles?.[profileName] ?? {
      user: DEFAULT_USER,
      key: keyHint,
      port: DEFAULT_PORT,
      remote_dir: cfg.remote_dir ?? DEFAULT_REMOTE_DIR,
      ttl_minutes: DEFAULT_TTL_MINUTES,
    };
    // Overwrite: show saved values. New: template defaults (not another profile).
    const defaultsForAsk: ProfileConfig = isNew
      ? {
          user: DEFAULT_USER,
          key: keyHint,
          port: DEFAULT_PORT,
          remote_dir: DEFAULT_REMOTE_DIR,
          ttl_minutes: DEFAULT_TTL_MINUTES,
        }
      : current;

    const profile = await askProfileFields(rl, defaultsForAsk, keyHint);

    let watchDir = cfg.watch_dir ?? defaultWatchDir();
    let acceptAll = cfg.accept_all_files ?? true;
    if (!hasProfiles) {
      watchDir = await ask(rl, "Screenshots / watch folder", defaultWatchDir());
      const allAns = await ask(
        rl,
        "Accept all file types (pdf, video, …), not just images?",
        "Y",
      );
      acceptAll = !/^n(o)?$/i.test(allAns);
    }
    const sweeperAns = await askYesNo(rl, "Install remote cleanup sweeper?", true);

    if (askMakeDefault) {
      const makeDef = await askYesNo(rl, "Make this the default profile?", false);
      if (makeDef) cfg.default_profile = profileName;
    } else if (!hasProfiles) {
      cfg.default_profile = profileName;
    }

    cfg.profiles = cfg.profiles ?? {};
    cfg.profiles[profileName] = profile;

    if (!hasProfiles) {
      cfg.profiles = { [profileName]: profile };
      cfg.remote_dir = profile.remote_dir ?? DEFAULT_REMOTE_DIR;
      cfg.ttl_minutes = profile.ttl_minutes;
      cfg.watch_dir = watchDir;
      cfg.accept_all_files = acceptAll;
      cfg.watch_include_video = acceptAll;
    }

    await saveConfig(cfg);
    console.log(`\nWrote ${configPath()}`);

    await tryRemoteSetup(cfg, profileName, sweeperAns);
  } finally {
    rl.close();
  }

  printNext();
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
