# Changelog

All notable changes to this project are documented in this file.

## 0.1.1 — 2026-09-10

- Add `main` / `exports` so package scanners can resolve an entry point

## 0.1.0 — 2026-09-10

First public release. npm package: **`@nyxsky404/vmup`** (CLI command remains `vmup`).

- `vmup init` wizard (Enter defaults; `-y` + env for CI)
- Collect via file args, native picker, `--clip`, and `vmup watch`
- SSH upload to a unique `~/vmup/agents-<date>-<time>-<uuid>/` folder (`media-NN.ext`)
- Print + copy agent folder path and a ready-to-paste prompt; `--json` for scripts
- Named profiles, profile `ssh_host`, and one-shot `--ssh-host`
- Local staging cleanup on success; keep staging on failure
- Remote TTL sweeper (optional, every 10 minutes) plus client delayed delete
- `vmup prune` / `--local` / `--id`
- Refuse group/world-readable SSH keys with a `chmod 600` hint
