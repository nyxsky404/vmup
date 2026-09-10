import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function fileSha256(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash("sha256").update(buf).digest("hex");
}
