# Changelog

All notable changes to this project are documented in this file.

## 0.2.0 — 2026-09-10

- Upload/SSH progress spinner (stderr) so the CLI does not look stuck
- Light colors on success output (`NO_COLOR` respected)
- Default: all file types (images, video, pdf, …); init asks, default Y
- `max_file_mb` in config (default 200; not asked at init)
- Staged names: `image-NN`, `video-NN`, `file-NN`
- `vmup check` / `vmup check --sweeper` to retry SSH without the wizard
- Warn after upload if the remote sweeper is missing
- `--clip` captures Finder files as well as images; skips duplicate clipboard content (`clip_dedup`, default true)
- `done` / Ctrl+D finish `--clip` and pause stdin so the terminal tab does not exit
- `vmup --watch` as well as `vmup watch`

## 0.1.1 — 2026-09-10

- Add `main` / `exports` so package scanners can resolve an entry point

## 0.1.0 — 2026-09-10

First public release. npm package: **`@nyxsky404/vmup`** (CLI command remains `vmup`).
