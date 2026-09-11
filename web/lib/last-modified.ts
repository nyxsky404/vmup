import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dates = new Map<string, Date | undefined>();

function gitRoot() {
  const starts = [dirname(fileURLToPath(import.meta.url)), process.cwd()];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(dir, '.git'))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return undefined;
}

/** Last commit date for a file in this repo, if git history is available. */
export function gitLastModified(...filePaths: Array<string | undefined>) {
  const root = gitRoot();
  if (!root) return undefined;

  for (const filePath of filePaths) {
    if (!filePath) continue;
    if (dates.has(filePath)) {
      const cached = dates.get(filePath);
      if (cached) return cached;
      continue;
    }

    try {
      const out = execFileSync(
        'git',
        ['-C', root, 'log', '-1', '--format=%cI', '--', filePath],
        {
          encoding: 'utf8',
          timeout: 4000,
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).trim();
      const date = out ? new Date(out) : undefined;
      dates.set(filePath, date);
      if (date) return date;
    } catch {
      dates.set(filePath, undefined);
    }
  }

  return undefined;
}

export function docsSourcePath(page: { path: string; absolutePath?: string }) {
  return gitLastModified(
    page.absolutePath,
    `web/content/docs/${page.path}`,
    `content/docs/${page.path}`,
  );
}

export const homePageSourcePath = 'web/app/(home)/page.tsx';
