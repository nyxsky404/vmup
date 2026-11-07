# Contributing

Bug reports and pull requests are welcome. By contributing you agree that your work is licensed under the [MIT License](LICENSE).

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Bugs and features

Use the [Bug report](https://github.com/nyxsky404/vmup/issues/new?template=bug.yml) or [Feature request](https://github.com/nyxsky404/vmup/issues/new?template=feature.yml) form.

Include the command, `vmup --version`, and the printed error string. `--json` output helps when you have it.

Do **not** file a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).

## Your first contribution

Start with a [good first issue](https://github.com/nyxsky404/vmup/labels/good%20first%20issue). These should have a small scope, relevant file paths, and clear acceptance criteria. Comment on the issue before starting so contributors can coordinate. If none are available, ask in [Discussions](https://github.com/nyxsky404/vmup/discussions) or suggest a focused documentation improvement.

Fork the repository, clone your fork, and create a working branch:

```bash
git clone https://github.com/YOUR-USERNAME/vmup.git
cd vmup
git switch -c your-change
```

Keep bug reports in Issues, questions and ideas in Discussions, and security reports private.

## CLI

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run build
npm test
```

`npm test` runs the compiled tests under `dist/`. `npm run build` (`tsc`) must succeed first. `npm install` already runs the build via `prepare`.

Source is in `src/`. Do not commit `dist/` or `node_modules/`.

User-facing CLI changes: add a bullet under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md), copy the same bullet to `web/content/docs/changelog.mdx`, and update every README and docs page describing the changed behavior. Follow the change-to-docs table in [AGENTS.md](AGENTS.md). Leave version numbers alone unless cutting a release.

## Docs site

The site lives in `web/` (Next.js) and requires Node.js 22.22 or newer. From `web/`:

```bash
npm install
npm run dev
```

Page sources are Markdown/MDX under `web/content/docs/`.

Problem-focused guides live under `web/content/learn/`. New pages also need navigation, title maps, and (for Learn) the registry entries documented in [AGENTS.md](AGENTS.md). Leave `web/AGENTS.md` and `web/CLAUDE.md` alone.

Before opening a docs or site PR, run `npm run build` from `web/`. For UI changes, also check the affected flow in a browser at desktop and mobile widths and with the keyboard.

## Pull requests

- Keep the change focused.
- Add or update tests in `src/` when CLI behavior changes.
- Update `CHANGELOG.md` for user-facing CLI changes.
- Do not commit `.env`, `.env.local`, SSH keys, or Vercel tokens.
- Explain the problem, resulting behavior, and checks you ran. Include local before/after screenshots for visual changes; never include private tenant data or credentials.
- Run `npm run build && npm test` at the repository root for CLI changes. Do not commit generated `dist/` files.

## License

vmup uses the [MIT License](LICENSE). Submit only work you have permission to contribute under that license.
