export const PACKAGE_NAME = '@nyxsky404/vmup';
export const GITHUB_URL = 'https://github.com/nyxsky404/vmup';
export const NPM_URL = 'https://www.npmjs.com/package/@nyxsky404/vmup';
export const CURL_INSTALL =
  'curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh';

export const INSTALL_GLOBAL = {
  npm: `npm i -g ${PACKAGE_NAME}`,
  pnpm: `pnpm add -g ${PACKAGE_NAME}`,
  yarn: `yarn global add ${PACKAGE_NAME}`,
  bun: `bun install -g ${PACKAGE_NAME}`,
  curl: CURL_INSTALL,
} as const;

export const INSTALL_ONESHOT = {
  npm: `npx ${PACKAGE_NAME} init`,
  pnpm: `pnpm dlx ${PACKAGE_NAME} init`,
  yarn: `yarn dlx ${PACKAGE_NAME} init`,
  bun: `bunx ${PACKAGE_NAME} init`,
} as const;

export type InstallKind = 'global' | 'oneshot';

export function installCommands(kind: InstallKind = 'global') {
  return kind === 'oneshot' ? INSTALL_ONESHOT : INSTALL_GLOBAL;
}
