# Contributing

Bug reports and pull requests are welcome. By contributing you agree that your work is licensed under the [MIT License](LICENSE).

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Bugs and features

Use the [Bug report](https://github.com/nyxsky404/vmup/issues/new?template=bug.yml) or [Feature request](https://github.com/nyxsky404/vmup/issues/new?template=feature.yml) form.

Include the command, `vmup --version`, and the printed error string. `--json` output helps when you have it.

Do **not** file a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).

## CLI

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run build
npm test
```

`npm test` runs the compiled tests under `dist/`. `npm run build` (`tsc`) must succeed first. `npm install` already runs the build via `prepare`.

Source is in `src/`. Do not commit `dist/` or `node_modules/`.

User-facing CLI changes: add a line under the next version in [CHANGELOG.md](CHANGELOG.md).

## Docs site

The site lives in `web/` (Next.js). From `web/`:

```bash
npm install
npm run dev
```

Page sources are Markdown/MDX under `web/content/docs/`.

## Pull requests

- Keep the change focused.
- Add or update tests in `src/` when CLI behavior changes.
- Update `CHANGELOG.md` for user-facing CLI changes.
- Do not commit `.env`, `.env.local`, SSH keys, or Vercel tokens.
