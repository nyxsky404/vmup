import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { parse, stringify } from "smol-toml";
import {
  DEFAULT_PORT,
  DEFAULT_PROFILE,
  DEFAULT_PROMPT,
  DEFAULT_REMOTE_DIR,
  DEFAULT_TTL_HOURS,
  DEFAULT_USER,
  configDir,
  configPath as getConfigPath,
  defaultSshKeyHint,
  defaultWatchDir,
  expandHome,
} from "./constants.js";

export type ProfileConfig = {
  host?: string;
  user?: string;
  key?: string;
  port?: number;
  remote_dir?: string;
  ttl_hours?: number;
  ssh_host?: string;
};

export type VmupConfig = {
  default_profile?: string;
  prompt_template?: string;
  remote_dir?: string;
  ttl_hours?: number;
  watch_dir?: string;
  watch_include_video?: boolean;
  profiles?: Record<string, ProfileConfig>;
};

export type ResolvedTarget = {
  profileName: string;
  mode: "direct" | "ssh_host";
  sshHostAlias?: string;
  host?: string;
  user?: string;
  key?: string;
  port: number;
  remoteDir: string;
  ttlHours: number;
  promptTemplate: string;
  watchDir: string;
  watchIncludeVideo: boolean;
};

export function configPath(): string {
  return getConfigPath();
}

export async function loadConfig(): Promise<VmupConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return parse(raw) as VmupConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(cfg: VmupConfig): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(configPath(), stringify(cfg) + "\n", "utf8");
}

export async function configExists(): Promise<boolean> {
  try {
    await access(configPath(), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function envOverride(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export type ResolveOptions = {
  profile?: string;
  sshHost?: string;
  ttlHours?: number;
  remoteDir?: string;
  watchDir?: string;
  includeVideo?: boolean;
};

export function resolveTarget(
  cfg: VmupConfig,
  opts: ResolveOptions = {},
): ResolvedTarget {
  if (opts.profile && opts.sshHost) {
    throw new Error("Use either --profile or --ssh-host, not both");
  }

  const promptTemplate =
    envOverride("VMUP_PROMPT") ?? cfg.prompt_template ?? DEFAULT_PROMPT;
  const globalRemote =
    opts.remoteDir ??
    envOverride("VMUP_REMOTE_DIR") ??
    cfg.remote_dir ??
    DEFAULT_REMOTE_DIR;
  const globalTtl = Number(
    opts.ttlHours ??
      envOverride("VMUP_TTL_HOURS") ??
      cfg.ttl_hours ??
      DEFAULT_TTL_HOURS,
  );
  const watchDir =
    opts.watchDir ??
    envOverride("VMUP_WATCH_DIR") ??
    cfg.watch_dir ??
    defaultWatchDir();
  const watchIncludeVideo =
    opts.includeVideo ??
    (envOverride("VMUP_WATCH_VIDEO") === "1"
      ? true
      : (cfg.watch_include_video ?? false));

  if (opts.sshHost || envOverride("VMUP_SSH_HOST")) {
    const alias = opts.sshHost ?? envOverride("VMUP_SSH_HOST")!;
    return {
      profileName: `ssh:${alias}`,
      mode: "ssh_host",
      sshHostAlias: alias,
      port: DEFAULT_PORT,
      remoteDir: globalRemote,
      ttlHours: globalTtl,
      promptTemplate,
      watchDir,
      watchIncludeVideo,
    };
  }

  const profileName =
    opts.profile ??
    envOverride("VMUP_PROFILE") ??
    cfg.default_profile ??
    DEFAULT_PROFILE;
  const profile = cfg.profiles?.[profileName] ?? {};

  if (profile.ssh_host) {
    return {
      profileName,
      mode: "ssh_host",
      sshHostAlias: profile.ssh_host,
      port: profile.port ?? DEFAULT_PORT,
      remoteDir: profile.remote_dir ?? globalRemote,
      ttlHours: profile.ttl_hours ?? globalTtl,
      promptTemplate,
      watchDir,
      watchIncludeVideo,
    };
  }

  const host = envOverride("VMUP_HOST") ?? profile.host;
  const user = envOverride("VMUP_USER") ?? profile.user ?? DEFAULT_USER;
  const key = envOverride("VMUP_KEY") ?? profile.key ?? defaultSshKeyHint();
  const port = Number(
    envOverride("VMUP_PORT") ?? profile.port ?? DEFAULT_PORT,
  );

  return {
    profileName,
    mode: "direct",
    host,
    user,
    key: key ? expandHome(key) : undefined,
    port,
    remoteDir: profile.remote_dir ?? globalRemote,
    ttlHours: profile.ttl_hours ?? globalTtl,
    promptTemplate,
    watchDir,
    watchIncludeVideo,
  };
}

export function assertTargetConnectable(target: ResolvedTarget): void {
  if (target.mode === "ssh_host") {
    if (!target.sshHostAlias) {
      throw new Error("ssh_host alias is missing");
    }
    return;
  }
  if (!target.host) {
    throw new Error(
      `Profile "${target.profileName}" has no host. Run: vmup init`,
    );
  }
  if (!target.key && !process.env.SSH_AUTH_SOCK) {
    throw new Error(
      `Profile "${target.profileName}" has no key. Set key in config or use ssh-agent.`,
    );
  }
}

export function renderPrompt(template: string, remotePath: string): string {
  return template.replaceAll("{{remote_path}}", remotePath);
}

export function emptyTemplateConfig(): VmupConfig {
  return {
    default_profile: DEFAULT_PROFILE,
    prompt_template: DEFAULT_PROMPT,
    remote_dir: DEFAULT_REMOTE_DIR,
    ttl_hours: DEFAULT_TTL_HOURS,
    watch_dir: defaultWatchDir(),
    watch_include_video: false,
    profiles: {
      [DEFAULT_PROFILE]: {
        user: DEFAULT_USER,
        key: defaultSshKeyHint(),
        remote_dir: DEFAULT_REMOTE_DIR,
        ttl_hours: DEFAULT_TTL_HOURS,
        port: DEFAULT_PORT,
      },
    },
  };
}
