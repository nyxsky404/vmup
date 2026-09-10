import { access, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { platform } from "node:os";

const GROUP_OR_OTHER = 0o077;

/**
 * Refuse missing or world/group-readable private keys.
 * Never logs key contents — path only.
 */
export async function assertKeyUsable(keyPath: string): Promise<void> {
  try {
    await access(keyPath, fsConstants.R_OK);
  } catch {
    throw new Error(
      `SSH key not found: ${keyPath}\nSet key in ~/.config/vmup/config.toml or VMUP_KEY.`,
    );
  }
  if (platform() === "win32") return;
  const s = await stat(keyPath);
  if ((s.mode & GROUP_OR_OTHER) !== 0) {
    const mode = (s.mode & 0o777).toString(8).padStart(3, "0");
    throw new Error(
      `SSH key permissions are too open (${mode}): ${keyPath}\nOpenSSH will refuse this key. Fix: chmod 600 ${keyPath}`,
    );
  }
}

/** Map common OpenSSH stderr to a short fix hint. Does not include secrets. */
export function formatSshError(raw: string): string {
  const t = raw.trim() || "SSH failed";
  const lower = t.toLowerCase();
  if (
    lower.includes("unprotected private key") ||
    lower.includes("bad permissions")
  ) {
    return `${t}\nFix: chmod 600 <your-private-key>`;
  }
  if (lower.includes("permission denied") && lower.includes("publickey")) {
    return `${t}\nCheck SSH user, IdentityFile, and that the matching public key is in remote ~/.ssh/authorized_keys.`;
  }
  if (lower.includes("connection refused")) {
    return `${t}\nHost is reachable but port 22 (or your configured port) is closed.`;
  }
  if (
    lower.includes("connection timed out") ||
    lower.includes("network is unreachable")
  ) {
    return `${t}\nCheck host/IP, VPN, and firewall.`;
  }
  if (lower.includes("could not resolve hostname")) {
    return `${t}\nCheck the host or SSH alias in ~/.ssh/config.`;
  }
  if (lower.includes("no such file or directory") && lower.includes("identity")) {
    return `${t}\nThe IdentityFile path does not exist.`;
  }
  return t;
}
