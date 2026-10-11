import {
  loadConfig,
  resolveTarget,
  assertTargetConnectable,
  type ResolveOptions,
} from "./config.js";
import {
  preflight,
  installRemoteSweeper,
  remoteSweeperStatus,
  type SweeperStatus,
} from "./transport/ssh.js";
import { emitJsonError } from "./output.js";
import { EXIT } from "./constants.js";
import { withSpinner } from "./progress.js";
import { color } from "./color.js";

export async function runCheck(opts: {
  profile?: string;
  sshHost?: string;
  sweeper?: boolean;
  json?: boolean;
}): Promise<number> {
  const cfg = await loadConfig();
  const resolveOpts: ResolveOptions = {
    profile: opts.profile,
    sshHost: opts.sshHost,
  };
  let target;
  try {
    target = resolveTarget(cfg, resolveOpts);
    assertTargetConnectable(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) emitJsonError(msg);
    else console.error(msg);
    return EXIT.USAGE;
  }

  try {
    await withSpinner("Checking SSH…", !!opts.json, () => preflight(target));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts.json) emitJsonError(msg);
    else console.error(color.red(`SSH failed: ${msg}`));
    return EXIT.SSH;
  }

  if (opts.sweeper) {
    try {
      await withSpinner("Installing remote sweeper…", !!opts.json, () =>
        installRemoteSweeper(target, target.ttlMinutes),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (opts.json) emitJsonError(msg);
      else console.error(color.red(`Sweeper install failed: ${msg}`));
      return EXIT.SSH;
    }
  }

  let sweeperStatus: SweeperStatus = "missing";
  try {
    sweeperStatus = await remoteSweeperStatus(target);
  } catch {
    sweeperStatus = "missing";
  }
  const sweeper = sweeperStatus !== "missing";

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          profile: target.profileName,
          remoteDir: target.remoteDir,
          sweeper,
          sweeperStatus,
        },
        null,
        2,
      ),
    );
    return EXIT.OK;
  }

  const who =
    target.mode === "ssh_host"
      ? `ssh_host=${target.sshHostAlias}`
      : `${target.user}@${target.host}`;
  console.log(`${color.green("SSH OK")}  ${target.profileName}  ${color.dim(who)}`);
  console.log(`${color.dim("Remote dir:")} ${target.remoteDir}`);
  if (sweeperStatus === "current") {
    console.log(`${color.dim("Sweeper:")} ${color.green("installed")}`);
  } else if (sweeperStatus === "outdated") {
    console.log(`${color.dim("Sweeper:")} ${color.yellow("outdated")}`);
    console.log(color.dim("  Upgrade:  vmup check --sweeper"));
  } else {
    console.log(`${color.dim("Sweeper:")} ${color.yellow("missing")}`);
    console.log(color.dim("  Reinstall:  vmup check --sweeper"));
  }
  return EXIT.OK;
}
