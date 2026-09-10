import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { parse, stringify } from "smol-toml";
import {
  DEFAULT_PORT,
  DEFAULT_PROFILE,
  DEFAULT_PROMPT,
  DEFAULT_REMOTE_DIR,
  DEFAULT_TTL_MINUTES,
  DEFAULT_USER,
  DEFAULT_MAX_FILE_MB,
  DEFAULT_ACCEPT_ALL_FILES,
  DEFAULT_CLIP_DEDUP,
  LEGACY_IMAGES_PROMPT,
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
  ttl_minutes?: number;
  /** @deprecated read-only fallback; prefer ttl_minutes */
  ttl_hours?: number;
  ssh_host?: string;
};

export type VmupConfig = {
  default_profile?: string;
  prompt_template?: string;
  remote_dir?: string;
  ttl_minutes?: number;
  /** @deprecated read-only fallback; prefer ttl_minutes */
  ttl_hours?: number;
  watch_dir?: string;
  watch_include_video?: boolean;
  /** When true (default), accept pdf/video/any file. When false, images only (+ video if enabled). */
  accept_all_files?: boolean;
  /** Per-file size limit in megabytes. */
  max_file_mb?: number;
  /** Skip identical clipboard captures in --clip (default true). */
  clip_dedup?: boolean;
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
  ttlMinutes: number;
  promptTemplate: string;
  watchDir: string;
  watchIncludeVideo: boolean;
  acceptAllFiles: boolean;
  maxFileMb: number;
  clipDedup: boolean;
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
  ttlMinutes?: number;
  remoteDir?: string;
  watchDir?: string;
  includeVideo?: boolean;
};

export function clampTtlMinutes(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_MINUTES;
  return Math.max(1, Math.round(n));
}

/** Effective TTL in minutes: explicit minutes, else hours * 60. */
export function ttlMinutesFromFields(opts: {
  minutes?: number;
  hours?: number;
}): number | undefined {
  if (opts.minutes != null && Number.isFinite(opts.minutes)) {
    return clampTtlMinutes(opts.minutes);
  }
  if (opts.hours != null && Number.isFinite(opts.hours)) {
    return clampTtlMinutes(opts.hours * 60);
  }
  return undefined;
}

/**
 * flags → env → profile → global config → default 5 minutes.
 * `ttl_hours` is only read when `ttl_minutes` is absent (old configs).
 */
export function resolveTtlMinutes(
  cfg: VmupConfig,
  opts: ResolveOptions = {},
  profile?: ProfileConfig,
): number {
  if (opts.ttlMinutes != null) return clampTtlMinutes(opts.ttlMinutes);
  const envMin = envOverride("VMUP_TTL_MINUTES");
  if (envMin) return clampTtlMinutes(Number(envMin));
  const envHours = envOverride("VMUP_TTL_HOURS");
  if (envHours) return clampTtlMinutes(Number(envHours) * 60);
  const fromProfile = ttlMinutesFromFields({
    minutes: profile?.ttl_minutes,
    hours: profile?.ttl_hours,
  });
  if (fromProfile != null) return fromProfile;
  const fromGlobal = ttlMinutesFromFields({
    minutes: cfg.ttl_minutes,
    hours: cfg.ttl_hours,
  });
  if (fromGlobal != null) return fromGlobal;
  return DEFAULT_TTL_MINUTES;
}

function resolvePrompt(cfg: VmupConfig): string {
  const raw = envOverride("VMUP_PROMPT") ?? cfg.prompt_template;
  if (!raw || raw === LEGACY_IMAGES_PROMPT) return DEFAULT_PROMPT;
  return raw;
}

export function resolveTarget(
  cfg: VmupConfig,
  opts: ResolveOptions = {},
): ResolvedTarget {
  if (opts.profile && opts.sshHost) {
    throw new Error("Use either --profile or --ssh-host, not both");
  }

  const promptTemplate = resolvePrompt(cfg);
  const globalRemote =
    opts.remoteDir ??
    envOverride("VMUP_REMOTE_DIR") ??
    cfg.remote_dir ??
    DEFAULT_REMOTE_DIR;
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

  const acceptAllFiles =
    envOverride("VMUP_ACCEPT_ALL") === "0"
      ? false
      : envOverride("VMUP_ACCEPT_ALL") === "1"
        ? true
        : (cfg.accept_all_files ?? DEFAULT_ACCEPT_ALL_FILES);

  const maxFileMb = Number(
    envOverride("VMUP_MAX_FILE_MB") ?? cfg.max_file_mb ?? DEFAULT_MAX_FILE_MB,
  );

  const clipDedup =
    envOverride("VMUP_CLIP_DEDUP") === "0"
      ? false
      : envOverride("VMUP_CLIP_DEDUP") === "1"
        ? true
        : (cfg.clip_dedup ?? DEFAULT_CLIP_DEDUP);

  const extras = {
    watchDir,
    watchIncludeVideo,
    acceptAllFiles,
    maxFileMb: Number.isFinite(maxFileMb) && maxFileMb > 0 ? maxFileMb : DEFAULT_MAX_FILE_MB,
    clipDedup,
  };

  if (opts.sshHost || envOverride("VMUP_SSH_HOST")) {
    const alias = opts.sshHost ?? envOverride("VMUP_SSH_HOST")!;
    return {
      profileName: `ssh:${alias}`,
      mode: "ssh_host",
      sshHostAlias: alias,
      port: DEFAULT_PORT,
      remoteDir: globalRemote,
      ttlMinutes: resolveTtlMinutes(cfg, opts),
      promptTemplate,
      ...extras,
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
      ttlMinutes: resolveTtlMinutes(cfg, opts, profile),
      promptTemplate,
      ...extras,
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
    ttlMinutes: resolveTtlMinutes(cfg, opts, profile),
    promptTemplate,
    ...extras,
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
    ttl_minutes: DEFAULT_TTL_MINUTES,
    watch_dir: defaultWatchDir(),
    watch_include_video: false,
    accept_all_files: DEFAULT_ACCEPT_ALL_FILES,
    max_file_mb: DEFAULT_MAX_FILE_MB,
    clip_dedup: DEFAULT_CLIP_DEDUP,
    profiles: {
      [DEFAULT_PROFILE]: {
        user: DEFAULT_USER,
        key: defaultSshKeyHint(),
        remote_dir: DEFAULT_REMOTE_DIR,
        ttl_minutes: DEFAULT_TTL_MINUTES,
        port: DEFAULT_PORT,
      },
    },
  };
}
